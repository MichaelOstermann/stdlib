import type { MessageFormatElement } from "@formatjs/icu-messageformat-parser"
import type { Part, Style } from "../src/parse"
import { parse as formatjs, TYPE } from "@formatjs/icu-messageformat-parser"
import { describe, expect, it } from "bun:test"
import { parse, ParseError } from "../src/parse"

/** What formatjs parses, as our parts, or nothing for what we do not support. */
function reference(source: string): Part[] | undefined {
    let elements: MessageFormatElement[]
    try {
        elements = formatjs(source)
    }
    catch {
        return
    }
    return convert(elements)
}

function convert(elements: MessageFormatElement[]): Part[] | undefined {
    const parts: Part[] = []
    for (const element of elements) {
        const part = convertElement(element)
        if (!part) return
        // formatjs splits text around an apostrophe that quotes nothing.
        const last = parts.at(-1)
        if (last?.type === "text" && part.type === "text") last.value += part.value
        else parts.push(part)
    }
    return parts
}

function convertElement(element: MessageFormatElement): Part | undefined {
    switch (element.type) {
        case TYPE.literal:
            return { type: "text", value: element.value }
        case TYPE.argument:
            return { name: element.value, type: "argument" }
        case TYPE.number:
            return element.style ? undefined : { name: element.value, type: "number" }
        case TYPE.date:
        case TYPE.time: {
            if (typeof element.style === "object" && element.style) return
            if (element.style && !["short", "medium", "long", "full"].includes(element.style)) return
            const style = (element.style ?? undefined) as Style | undefined
            return { name: element.value, style, type: element.type === TYPE.date ? "date" : "time" }
        }
        case TYPE.pound:
            return { type: "pound" }
        case TYPE.select: {
            const options = convertOptions(element.options)
            return options && { name: element.value, options, type: "select" }
        }
        case TYPE.plural: {
            if (element.offset) return
            const options = convertOptions(element.options)
            if (!options?.every(({ key }) => key.startsWith("=") || ["zero", "one", "two", "few", "many", "other"].includes(key))) return
            return { name: element.value, options, ordinal: element.pluralType === "ordinal", type: "plural" }
        }
        case TYPE.tag:
            return undefined
    }
}

function convertOptions(options: Record<string, { value: MessageFormatElement[] }>): { key: string, parts: Part[] }[] | undefined {
    const converted: { key: string, parts: Part[] }[] = []
    for (const [key, option] of Object.entries(options)) {
        const parts = convert(option.value)
        if (!parts) return
        converted.push({ key, parts })
    }
    return converted
}

function ours(source: string): Part[] | undefined {
    try {
        return parse(source)
    }
    catch (error) {
        if (!(error instanceof ParseError)) throw error
        return undefined
    }
}

/** Options in the order formatjs keeps them in, an object, where `1` goes before `a`. */
function ordered(parts: Part[] | undefined): unknown {
    return parts?.map((part) => {
        if (part.type !== "plural" && part.type !== "select") return part
        const options = Object.fromEntries(part.options.map(({ key, parts }) => [key, ordered(parts)]))
        return { ...part, options }
    })
}

function error(source: string): string {
    try {
        parse(source)
    }
    catch (error) {
        if (error instanceof ParseError) return error.message
        throw error
    }
    throw new Error(`no error for ${source}`)
}

const cases = [
    "",
    "Sign in",
    "Hi {name}!",
    "Hi { name }!",
    "{count, number}",
    "Due {when, date}",
    "Due {when, date, short}",
    "At {when, time, full}",
    "{count, plural, =0 {No tasks} one {# task} other {# tasks}}",
    "{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}",
    "{role, select, admin {Admin} other {Member}}",
    "{n, plural, other {{role, select, admin {# admins} other {# members}}}}",
    "{n, plural, one {'#' is #} other {#}}",
    "# outside",
    "It''s",
    "It's",
    "'{name}' is literal",
    "'{a} '' b' c",
    "unterminated '{quote",
    "a } b",
    "a < b > c",
    "a <3",
    "'<b>' quoted",
    "{a}{b}{c}",
    "line\nbreak {x}",
    "{ n , plural , one { one } other { other } }",
    "{x, select, 1 {one} a {a} other {other}}",
    "emoji 🎉 {name}",
]

describe("parse", () => {
    it("should parse what formatjs parses", () => {
        for (const source of cases) {
            const expected = reference(source)
            expect(expected, source).toBeDefined()
            expect(ordered(parse(source)), source).toEqual(ordered(expected))
        }
    })

    it("should explain what is wrong, and where", () => {
        expect(error("Assigned to {name")).toBe(`expected "}" or "," after "Assigned to {name"`)
        expect(error("{}")).toBe(`expected the name of an argument after "{"`)
        expect(error("{n, plural, one {# item}}")).toBe(`missing "other" after "{n, plural, one {# item}"`)
        expect(error("{n, plural, ones {#} other {#}}")).toBe(`unknown plural category "ones", expected zero, one, two, few, many, other or =0 after "{n, plural, "`)
        expect(error("{n, plural, offset:1 other {#}}")).toBe(`plural offsets are not supported yet after "{n, plural, "`)
        expect(error("{n, number, percent}")).toBe(`number styles are not supported yet after "{n, number"`)
        expect(error("{d, date, ::yyyyMMdd}")).toBe(`date skeletons are not supported yet after "{d, date, "`)
        expect(error("{d, date, weird}")).toBe(`unknown style "weird", expected short, medium, long, full after "{d, date, "`)
        expect(error("{d, wat}")).toBe(`unknown type "wat", expected number, date, time, plural, select or selectordinal after "{d, wat"`)
        expect(error("{x, select, a {A} a {B} other {C}}")).toBe(`"a" is there twice after "{x, select, a {A} "`)
        expect(error("Click <b>here</b>")).toBe(`tags are not supported yet after "Click "`)
        expect(error("a very long message with a mistake at the {end")).toBe(`expected "}" or "," after "…th a mistake at the {end"`)
        expect(new ParseError("", 3).offset).toBe(3)
    })

    it("should agree with formatjs on random messages", () => {
        const random = seeded(1)
        const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)]!
        const names = ["n", "name", "count", "x"]

        function message(depth: number, plural: boolean): string {
            let source = ""
            for (let i = Math.floor(random() * 4); i > 0; i--) source += piece(depth, plural)
            return source
        }

        function piece(depth: number, plural: boolean): string {
            const kinds = ["text", "text", "quote", "argument", ...(depth < 3 ? ["number", "date", "plural", "select"] : [])]
            if (plural) kinds.push("pound")
            switch (pick(kinds)) {
                case "text":
                    return pick(["a", "b c", " ", "'", "''", "#", "<", ">", "}", "é", "\n"])
                case "quote":
                    return pick(["'{", "'}'", "'#'", "'<b>'", "'{x}'", "'''"])
                case "argument":
                    return `{${pick(["", " "])}${pick(names)}${pick(["", " "])}}`
                case "number":
                    return `{${pick(names)}, number${pick(["", ", percent"])}}`
                case "date":
                    return `{${pick(names)}, ${pick(["date", "time"])}${pick(["", ", short", ", full", ", weird", ", ::yMd"])}}`
                case "pound":
                    return "#"
                case "plural": {
                    const keys = [...new Set([pick(["one", "=0", "few", "ones"]), pick(["two", "=1", "other"]), "other"])]
                    const options = keys.map((key) => `${key} {${message(depth + 1, true)}}`).join(" ")
                    return `{${pick(names)}, ${pick(["plural", "selectordinal"])}, ${options}}`
                }
                case "select": {
                    const keys = [...new Set([pick(["a", "1", "admin"]), "other"])]
                    const options = keys.map((key) => `${key} {${message(depth + 1, false)}}`).join(" ")
                    return `{${pick(names)}, select, ${options}}`
                }
            }
            return ""
        }

        // Valid messages, then the same with a character dropped, doubled or inserted somewhere.
        let compared = 0
        for (let i = 0; i < 20_000; i++) {
            let source = message(0, false)
            if (i % 2) {
                const at = Math.floor(random() * (source.length + 1))
                const mutation = pick(["drop", "double", "insert"])
                if (mutation === "drop") source = source.slice(0, at) + source.slice(at + 1)
                if (mutation === "double") source = source.slice(0, at) + source.slice(at, at + 1) + source.slice(at)
                if (mutation === "insert") source = source.slice(0, at) + pick(["{", "}", "'", ",", "#", " "]) + source.slice(at)
            }
            const expected = reference(source)
            const actual = ours(source)
            if (expected) compared++
            expect(ordered(actual), source).toEqual(ordered(expected))
        }
        // Enough of them are valid for this to mean something.
        expect(compared).toBeGreaterThan(5_000)
    })
})

// mulberry32, for random messages that are the same on every run.
function seeded(seed: number): () => number {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
