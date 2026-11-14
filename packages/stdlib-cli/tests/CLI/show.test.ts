import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

function lines(...rows: string[]): string {
    return rows.join("\n")
}

describe("CLI.show", () => {
    describe("JSON", () => {
        it("should show one key or item per line, nested ones indented", () => {
            const member = { address: { city: "Vienna" }, email: "jane@miko.dev", plan: null, seats: 3, tags: ["admin", "billing"], verified: true }
            expect(CLI.show(member)).toBe(lines(
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
            expect(CLI.show([{ name: "core", since: 2021 }, [1, 2]])).toBe(lines(
                "- name: core",
                "  since: 2021",
                "- - 1",
                "  - 2",
            ))
        })

        it("should keep empty arrays and objects on the line of their key", () => {
            expect(CLI.show({ list: [], object: {} })).toBe(lines("list: []", "object: {}"))
            expect(CLI.show([])).toBe("[]")
        })

        it("should return a string on its own as it is", () => {
            expect(CLI.show("Listening")).toBe("Listening")
            expect(CLI.show(3)).toBe("3")
        })

        it("should quote strings and keys like Bun.YAML", () => {
            expect(CLI.show({ "a: b": "", "first name": "Jane", "note": "Line one\nLine two", "tags": ["a, b"], "zip": "1010" })).toBe(lines(
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
            expect(CLI.show(value, { compact: true, width: 80 })).toBe("{ email: jane@miko.dev, tags: [admin] }")
            expect(CLI.show(value, { compact: true, width: 20 })).toBe(lines("email: jane@miko.dev", "tags:", "  - admin"))
        })

        it("should wrap long strings in line with where they start", () => {
            expect(CLI.show({ note: "one two three four five six" }, { width: 30 })).toBe(lines(
                "note: one two three four five",
                "      six",
            ))
        })

        it("should cut off long arrays, objects and strings", () => {
            expect(CLI.show([1, 2, 3, 4, 5], { maxItems: 3 })).toBe(lines("- 1", "- 2", "- 3", "… 2 more"))
            expect(CLI.show({ a: 1, b: 2, c: 3 }, { maxItems: 2 })).toBe(lines("a: 1", "b: 2", "… 1 more"))
            expect(CLI.show({ note: "abcdefghij" }, { maxString: 4 })).toBe("note: abcd … 6 more characters")
            expect(CLI.show([1, 2, 3], { compact: true, maxItems: 2 })).toBe("[1, 2, … 1 more]")
        })
    })

    describe("errors", () => {
        it("should show the name, the message and the other fields that are JSON", () => {
            const error = Object.assign(new TypeError("Could not add the member"), { status: 503, notJSON: () => {} })
            expect(CLI.show(error)).toBe(lines(
                "TypeError: Could not add the member",
                "  status: 503",
            ))
        })

        it("should show the cause below, and its cause below that", () => {
            const root = Object.assign(new Error("Connection refused"), { host: "db.miko.dev" })
            const error = new Error("Could not add the member", { cause: new Error("Query failed", { cause: root }) })
            expect(CLI.show(error)).toBe(lines(
                "Error: Could not add the member",
                "  cause: Error: Query failed",
                "    cause: Error: Connection refused",
                "      host: db.miko.dev",
            ))
        })

        it("should show the errors of an AggregateError", () => {
            const error = Error.from(new AggregateError([new Error("First failed"), { code: 3 }], "Several failed"))
            expect(CLI.show(error)).toBe(lines(
                "AggregateError: Several failed",
                "  errors:",
                "    - Error: First failed",
                "    - Error",
                "        code: 3",
            ))
        })

        it("should show an error once when it is its own cause", () => {
            const error = new Error("Loop")
            error.cause = error
            expect(CLI.show(error)).toBe("Error: Loop")
        })

        it("should show an error without a message by its name", () => {
            expect(CLI.show(Error.from({ code: 3 }))).toBe(lines("Error", "  code: 3"))
        })
    })
})
