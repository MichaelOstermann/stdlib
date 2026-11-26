import type { SQLQueryBindings } from "bun:sqlite"

export type LogQuery = LogQuery.Term[]

export namespace LogQuery {
    export type Operator = "<" | "<=" | "=" | ">" | ">="

    export type Term =
        | { kind: "field", key: string, negated: boolean, operator: Operator, value: string }
        | { kind: "range", from: string, key: string, negated: boolean, to: string }
        | { kind: "word", negated: boolean, value: string }

    export interface Where {
        params: SQLQueryBindings[]
        sql: string
    }
}

type FieldTerm = Extract<LogQuery.Term, { kind: "field" }>
type DateRange = { end: string, start: string }

const TERM = /-?(?:[^\s"]+:)?"[^"]*"?|\S+/g
const FIELD = /^([^\s":]+):(.*)$/s
const OPERATOR = /^(<=|>=|<|>)?(.*)$/s
const DATE = /^(?:(\d{4})-(\d{1,2})-(\d{1,2}))?(?:(?:^|[T ])(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/

/**
 * Turns a search like `timeout level:error date:>2026-11-01 status:>=500` into terms.
 *
 * - A word matches the message, ignoring case.
 * - `key:value` matches a field: `level`, `date`, or a key in the data, like `status` or `user.id`.
 *   A string in the data matches when it contains `value`, ignoring case. Other values match
 *   exactly.
 * - `key:>value`, `key:>=value`, `key:<value` and `key:<=value` compare.
 * - `key:a..b` matches from `a` to `b`, both included.
 * - Quotes keep spaces: `"sync failed"` or `date:"2026-11-01 14:00"`.
 * - A `-` in front excludes what the term matches: `-level:debug`.
 * - A date is local time: `2026-11-01`, `2026-11-01T14:00`, `14:00` (today), `today` or
 *   `yesterday`.
 */
function parse(query: string): LogQuery {
    return (query.match(TERM) ?? []).flatMap(termsOf)
}

function termsOf(text: string): LogQuery.Term[] {
    const negated = text.length > 1 && text.startsWith("-")
    const term = negated ? text.slice(1) : text
    const field = FIELD.exec(term)
    if (!field) return [{ kind: "word", negated, value: unquote(term) }]
    const key = field[1]!
    const value = unquote(field[2]!)
    const range = value.split("..")
    if (range.length === 2) return [{ from: range[0]!, key, kind: "range", negated, to: range[1]! }]
    const [, operator = "=", operand = ""] = OPERATOR.exec(value)!
    return [{ key, kind: "field", negated, operator: operator as LogQuery.Operator, value: operand }]
}

function unquote(text: string): string {
    return text.replace(/^"|"$/g, "")
}

/**
 * Returns the SQL condition for the `logs` table that matches every term. Terms with the same key
 * and `=` match when any of them matches, like `level:warn level:error`.
 */
function where(query: LogQuery): LogQuery.Where {
    const conditions = [
        ...query.filter((term) => term.kind === "word").map(wordCondition),
        ...Map.groupBy(query.filter(isEquality), (term) => `${term.negated}:${term.key}`).values().map(equalityCondition),
        ...query.filter(isComparison).map(comparisonCondition),
        ...query.filter((term) => term.kind === "range").map(rangeCondition),
    ]
    if (!conditions.length) return { params: [], sql: "1" }
    return allCondition(conditions)
}

function isEquality(term: LogQuery.Term): term is FieldTerm {
    return term.kind === "field" && term.operator === "="
}

function isComparison(term: LogQuery.Term): term is FieldTerm {
    return term.kind === "field" && term.operator !== "="
}

/** Turns a missing data key into no match, so that `-status:500` keeps logs without `status`. */
function negate(negated: boolean, condition: LogQuery.Where): LogQuery.Where {
    if (!negated) return condition
    return { params: condition.params, sql: `NOT coalesce((${condition.sql}), 0)` }
}

function wordCondition(term: Extract<LogQuery.Term, { kind: "word" }>): LogQuery.Where {
    return negate(term.negated, { params: [containsPattern(term.value)], sql: "message LIKE ? ESCAPE '\\'" })
}

function containsPattern(value: string): string {
    return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

function equalityCondition(terms: FieldTerm[]): LogQuery.Where {
    const { key, negated } = terms[0]!
    const values = terms.map((term) => term.value)
    if (key === "level") return negate(negated, { params: values, sql: `level IN (${values.map(() => "?").join(", ")})` })
    if (key === "date") return negate(negated, anyCondition(values.map((value) => dateCondition("=", value))))
    return negate(negated, anyCondition(values.map((value) => dataCondition(key, value))))
}

function dataCondition(key: string, value: string): LogQuery.Where {
    const path = `$.${key}`
    return {
        params: [path, path, containsPattern(value), path, value],
        sql: "json_type(data, ?) = 'text' AND data ->> ? LIKE ? ESCAPE '\\' OR data -> ? = ?",
    }
}

function comparisonCondition(term: FieldTerm): LogQuery.Where {
    return negate(term.negated, compare(term.key, term.operator, term.value))
}

function rangeCondition(term: Extract<LogQuery.Term, { kind: "range" }>): LogQuery.Where {
    return negate(term.negated, allCondition([compare(term.key, ">=", term.from), compare(term.key, "<=", term.to)]))
}

function compare(key: string, operator: LogQuery.Operator, value: string): LogQuery.Where {
    if (key === "date") return dateCondition(operator, value)
    if (key === "level") return { params: [value], sql: `level ${operator} ?` }
    return { params: [`$.${key}`, operand(value)], sql: `data ->> ? ${operator} ?` }
}

function allCondition(conditions: LogQuery.Where[]): LogQuery.Where {
    return {
        params: conditions.flatMap((condition) => condition.params),
        sql: conditions.map((condition) => `(${condition.sql})`).join(" AND "),
    }
}

function anyCondition(conditions: LogQuery.Where[]): LogQuery.Where {
    return {
        params: conditions.flatMap((condition) => condition.params),
        sql: conditions.map((condition) => `(${condition.sql})`).join(" OR "),
    }
}

function dateCondition(operator: LogQuery.Operator, value: string): LogQuery.Where {
    const range = dateRange(value, new Date())
    if (!range) return { params: [], sql: "0" }
    if (operator === "=") return { params: [range.start, range.end], sql: "date >= ? AND date < ?" }
    if (operator === ">") return { params: [range.end], sql: "date >= ?" }
    if (operator === ">=") return { params: [range.start], sql: "date >= ?" }
    if (operator === "<") return { params: [range.start], sql: "date < ?" }
    return { params: [range.end], sql: "date < ?" }
}

/** Returns the day, minute or second that `value` names in local time, as UTC dates. */
function dateRange(value: string, now: Date): DateRange | undefined {
    if (value === "today") return dayRange(now.getFullYear(), now.getMonth(), now.getDate())
    if (value === "yesterday") return dayRange(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const match = DATE.exec(value)
    if (!value || !match) return undefined
    const [, year, month, day, hour, minute, second] = match
    const date = year ? [Number(year), Number(month) - 1, Number(day)] as const : [now.getFullYear(), now.getMonth(), now.getDate()] as const
    if (hour === undefined) return dayRange(...date)
    const start = new Date(...date, Number(hour), Number(minute), Number(second ?? 0))
    const end = new Date(start.getTime() + (second === undefined ? 60_000 : 1000))
    return { end: end.toISOString(), start: start.toISOString() }
}

function dayRange(year: number, month: number, day: number): DateRange {
    return { end: new Date(year, month, day + 1).toISOString(), start: new Date(year, month, day).toISOString() }
}

function operand(value: string): number | string {
    const number = Number(value)
    if (value.trim() === "" || Number.isNaN(number)) return value
    return number
}

export const LogQuery = {
    parse,
    where,
}
