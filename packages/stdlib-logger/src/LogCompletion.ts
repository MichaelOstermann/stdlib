export interface LogCompletion {
    /** What can replace `typed`, the most likely first. */
    options: string[]
    /** The typed text that the options complete, at the end of the search. */
    typed: string
}

/** The keys in the data of recent logs, each with its values, the most common first. */
export type LogFields = Map<string, string[]>

const FIXED_FIELDS: LogFields = new Map([
    ["date", ["today", "yesterday"]],
    ["level", ["debug", "info", "warn", "error"]],
])

/**
 * Returns what can complete the last term of `search`. Without a `:`, the options are keys,
 * followed by `:`. After `key:`, the options are the values of `key`.
 */
function complete(search: string, fields: LogFields): LogCompletion {
    const term = search.slice(search.search(/\S*$/)).replace(/^-/, "")
    const colon = term.indexOf(":")
    if (colon === -1) return keyCompletion(term, fields)
    const key = term.slice(0, colon)
    const typed = term.slice(colon + 1).replace(/^[<>]=?/, "")
    const values = FIXED_FIELDS.get(key) ?? fields.get(key) ?? []
    return { options: startingWith(values, typed).map(quoted), typed }
}

function keyCompletion(typed: string, fields: LogFields): LogCompletion {
    if (!typed) return { options: [], typed }
    const keys = [...FIXED_FIELDS.keys(), ...fields.keys()]
    return { options: startingWith(keys, typed).map((key) => `${key}:`), typed }
}

function startingWith(options: string[], typed: string): string[] {
    const lower = typed.toLowerCase()
    return options.filter((option) => option.toLowerCase().startsWith(lower) && option.length > typed.length)
}

function quoted(value: string): string {
    if (/\s/.test(value)) return `"${value}"`
    return value
}

export const LogCompletion = {
    complete,
}
