import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

function lines(...rows: string[]): string {
    return rows.join("\n")
}

describe("CLI.formatJSON", () => {
    it("should show one key or item per line, nested ones indented", () => {
        const member = { address: { city: "Vienna" }, email: "jane@miko.dev", plan: null, seats: 3, tags: ["admin", "billing"], verified: true }
        expect(CLI.formatJSON(member)).toBe(lines(
            "address:",
            "  city: Vienna",
            "email: jane@miko.dev",
            "plan: null",
            "seats: 3",
            "tags:",
            "  - admin",
            "  - billing",
            "verified: true",
        ))
    })

    it("should show objects in arrays like YAML", () => {
        expect(CLI.formatJSON([{ name: "core", since: 2021 }, [1, 2]])).toBe(lines(
            "- name: core",
            "  since: 2021",
            "- - 1",
            "  - 2",
        ))
    })

    it("should keep empty arrays and objects on the line of their key", () => {
        expect(CLI.formatJSON({ list: [], object: {} })).toBe(lines("list: []", "object: {}"))
        expect(CLI.formatJSON([])).toBe("[]")
    })

    it("should return a string on its own as it is", () => {
        expect(CLI.formatJSON("Listening")).toBe("Listening")
        expect(CLI.formatJSON(3)).toBe("3")
    })

    it("should quote strings and keys like Bun.YAML", () => {
        expect(CLI.formatJSON({ "a: b": "", "first name": "Jane", "note": "Line one\nLine two", "tags": ["a, b"], "zip": "1010" })).toBe(lines(
            '"a: b": ""',
            "first name: Jane",
            'note: "Line one\\nLine two"',
            "tags:",
            '  - "a, b"',
            'zip: "1010"',
        ))
    })

    it("should put everything on one line with compact, when it fits", () => {
        const value = { email: "jane@miko.dev", tags: ["admin"] }
        expect(CLI.formatJSON(value, { compact: true, width: 80 })).toBe("{ email: jane@miko.dev, tags: [admin] }")
        expect(CLI.formatJSON(value, { compact: true, width: 20 })).toBe(lines("email: jane@miko.dev", "tags:", "  - admin"))
    })

    it("should wrap long strings in line with where they start", () => {
        expect(CLI.formatJSON({ note: "one two three four five six" }, { width: 30 })).toBe(lines(
            "note: one two three four five",
            "      six",
        ))
    })

    it("should cut off long arrays, objects and strings", () => {
        expect(CLI.formatJSON([1, 2, 3, 4, 5], { maxItems: 3 })).toBe(lines("- 1", "- 2", "- 3", "… 2 more"))
        expect(CLI.formatJSON({ a: 1, b: 2, c: 3 }, { maxItems: 2 })).toBe(lines("a: 1", "b: 2", "… 1 more"))
        expect(CLI.formatJSON({ note: "abcdefghij" }, { maxString: 4 })).toBe("note: abcd … 6 more characters")
        expect(CLI.formatJSON([1, 2, 3], { compact: true, maxItems: 2 })).toBe("[1, 2, … 1 more]")
    })
})

describe("CLI.formatFailure", () => {
    it("should show the name, the message and the meta", () => {
        expect(CLI.formatFailure(Failure.of("HttpError", "Could not add the member", { meta: { status: 503 } }))).toBe(lines(
            "HttpError: Could not add the member",
            "  status: 503",
        ))
    })

    it("should show the cause below, and its cause below that", () => {
        const root = Failure.of("Error", "Connection refused", { meta: { host: "db.miko.dev" } })
        const failure = Failure.of("SaveError", "Could not add the member", { cause: Failure.of("QueryError", "Query failed", { cause: root }) })
        expect(CLI.formatFailure(failure)).toBe(lines(
            "SaveError: Could not add the member",
            "  cause: QueryError: Query failed",
            "    cause: Error: Connection refused",
            "      host: db.miko.dev",
        ))
    })

    it("should show the errors it is made of", () => {
        const failure = Failure.from(new AggregateError([new Error("First failed"), { code: 3 }], "Several failed"))
        expect(CLI.formatFailure(failure)).toBe(lines(
            "AggregateError: Several failed",
            "  errors:",
            "    - Error: First failed",
            "    - Error",
            "        code: 3",
        ))
    })

    it("should show a failure without a message by its name", () => {
        expect(CLI.formatFailure(Failure.from({ code: 3 }))).toBe(lines("Error", "  code: 3"))
    })
})
