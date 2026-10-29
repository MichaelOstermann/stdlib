/** A message in ICU MessageFormat, as much of it as the compiler supports. */
export type Part =
    | { type: "argument", name: string }
    | { type: "date" | "time", name: string, style: Style | undefined }
    | { type: "number", name: string }
    | { type: "plural", name: string, options: Option[], ordinal: boolean }
    | { type: "pound" }
    | { type: "select", name: string, options: Option[] }
    | { type: "text", value: string }

/** `one {# item}`, `=0 {no items}`, `admin {Admin}` */
export type Option = { key: string, parts: Part[] }

export type Style = typeof styles[number]

export const styles = ["short", "medium", "long", "full"] as const

const categories = ["zero", "one", "two", "few", "many", "other"]

// What ICU calls Pattern_White_Space, and the characters of a name: anything but white space and
// pattern syntax, which is what formatjs takes too.
const space = /[\t\n\v\f\r \x85\u200E\u200F\u2028\u2029]*/y
const identifier = /[^\p{White_Space}\p{Pattern_Syntax}]*/uy

export class ParseError extends Error {
    constructor(message: string, readonly offset: number) {
        super(message)
    }
}

/**
 * The parts of `source`, or a `ParseError` with the offset of the mistake, such as
 * `expected "}" after "Assigned to {name"`.
 */
export function parse(source: string): Part[] {
    let offset = 0
    return message(false, false)

    // `nested` ends it at a `}`, `plural` makes `#` the number of the plural.
    function message(nested: boolean, plural: boolean): Part[] {
        const parts: Part[] = []
        while (offset < source.length) {
            const char = source[offset]!
            if (char === "}" && nested) break
            if (char === "{") {
                parts.push(argument())
                continue
            }
            if (char === "#" && plural) {
                offset++
                parts.push({ type: "pound" })
                continue
            }
            if (char === "<" && /[a-z/]/i.test(source[offset + 1] ?? "")) fail("tags are not supported yet")
            parts.push({ type: "text", value: text(nested, plural) })
        }
        return parts
    }

    // Up to the next argument, `#` or `}`, with `''` for an apostrophe and `'{…}'` for braces.
    function text(nested: boolean, plural: boolean): string {
        let value = ""
        while (offset < source.length) {
            const char = source[offset]!
            if (char === "{") break
            if (char === "}" && nested) break
            if (char === "#" && plural) break
            if (char === "<" && /[a-z/]/i.test(source[offset + 1] ?? "")) break
            if (char === "'") {
                value += quoted(plural)
                continue
            }
            value += char
            offset++
        }
        return value
    }

    // An apostrophe only quotes when the next character would mean something, otherwise it is one.
    function quoted(plural: boolean): string {
        const next = source[offset + 1]
        if (next === "'") {
            offset += 2
            return "'"
        }
        const quotes = next === "{" || next === "}" || next === "<" || next === ">" || (next === "#" && plural)
        if (!quotes) {
            offset++
            return "'"
        }
        let value = ""
        offset++
        while (offset < source.length) {
            if (source.startsWith("''", offset)) {
                value += "'"
                offset += 2
                continue
            }
            if (source[offset] === "'") {
                offset++
                break
            }
            value += source[offset]
            offset++
        }
        return value
    }

    // `{name}`, `{n, number}`, `{when, date, short}`, `{n, plural, …}`, `{x, select, …}`
    function argument(): Part {
        offset++
        skip(space)
        const name = read(identifier)
        if (!name) fail(`expected the name of an argument`)
        skip(space)
        if (eat("}")) return { name, type: "argument" }
        if (!eat(",")) fail(`expected "}" or ","`)
        skip(space)

        const type = read(identifier)
        skip(space)
        switch (type) {
            case "number":
                if (source[offset] === ",") fail(`number styles are not supported yet`)
                close()
                return { name, type: "number" }
            case "date":
            case "time": {
                const style = eat(",") ? dateStyle() : undefined
                close()
                return { name, style, type }
            }
            case "plural":
            case "selectordinal":
                if (!eat(",")) fail(`expected ","`)
                return { name, options: options(true), ordinal: type === "selectordinal", type: "plural" }
            case "select":
                if (!eat(",")) fail(`expected ","`)
                return { name, options: options(false), type: "select" }
            default:
                fail(type ? `unknown type "${type}", expected number, date, time, plural, select or selectordinal` : `expected a type`)
        }
    }

    function dateStyle(): Style {
        skip(space)
        const start = offset
        const style = read(/[^}]*/y).trimEnd()
        if (style.startsWith("::")) fail(`date skeletons are not supported yet`, start)
        if (!styles.includes(style as Style)) fail(`unknown style "${style}", expected ${styles.join(", ")}`, start)
        return style as Style
    }

    // `=0 {no items} one {# item} other {# items}}`, up to and with the `}` of the argument.
    function options(plural: boolean): Option[] {
        const options: Option[] = []
        while (true) {
            skip(space)
            const start = offset
            const key = plural && source[offset] === "=" ? exact() : read(identifier)
            if (!key) break
            if (plural && key === "offset" && source[offset] === ":") fail(`plural offsets are not supported yet`, start)
            if (plural && !key.startsWith("=") && !categories.includes(key)) fail(`unknown plural category "${key}", expected ${categories.join(", ")} or =0`, start)
            if (options.some((option) => option.key === key)) fail(`"${key}" is there twice`, start)
            skip(space)
            if (!eat("{")) fail(`expected "{"`)
            const parts = message(true, plural)
            if (!eat("}")) fail(`expected "}"`)
            options.push({ key, parts })
        }
        if (!options.length) fail(plural ? `expected a category such as "one" or "other"` : `expected an option such as "other"`)
        if (!options.some((option) => option.key === "other")) fail(`missing "other"`)
        close()
        return options
    }

    // `=0`, `=12`
    function exact(): string {
        const value = read(/=\d*/y)
        if (value === "=") fail(`expected a number after "="`)
        return value
    }

    function close(): void {
        skip(space)
        if (!eat("}")) fail(`expected "}"`)
    }

    function eat(char: string): boolean {
        if (source[offset] !== char) return false
        offset++
        return true
    }

    function read(pattern: RegExp): string {
        pattern.lastIndex = offset
        const value = pattern.exec(source)?.[0] ?? ""
        offset += value.length
        return value
    }

    function skip(pattern: RegExp): void {
        read(pattern)
    }

    function fail(reason: string, at = offset): never {
        const before = source.slice(Math.max(0, at - 24), at)
        const where = at === 0 ? "at the start" : `after "${at > 24 ? "…" : ""}${before}"`
        throw new ParseError(`${reason} ${where}`, at)
    }
}
