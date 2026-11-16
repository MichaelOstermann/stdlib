import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

function lines(...rows: string[]): string {
    return rows.join("\n")
}

describe("CLI.format.json", () => {
    it("should show one key or item per line, nested ones indented", () => {
        const member = { address: { city: "Vienna" }, email: "jane@miko.dev", plan: null, seats: 3, tags: ["admin", "billing"], verified: true }
        expect(CLI.format.json(member)).toBe(lines(
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
        expect(CLI.format.json([{ name: "core", since: 2021 }, [1, 2]])).toBe(lines(
            "- name: core",
            "  since: 2021",
            "- - 1",
            "  - 2",
        ))
    })

    it("should keep empty arrays and objects on the line of their key", () => {
        expect(CLI.format.json({ list: [], object: {} })).toBe(lines("list: []", "object: {}"))
        expect(CLI.format.json([])).toBe("[]")
    })

    it("should return a string on its own as it is", () => {
        expect(CLI.format.json("Listening")).toBe("Listening")
        expect(CLI.format.json(3)).toBe("3")
    })

    it("should quote strings and keys like Bun.YAML", () => {
        expect(CLI.format.json({ "a: b": "", "first name": "Jane", "note": "Line one\nLine two", "tags": ["a, b"], "zip": "1010" })).toBe(lines(
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
        expect(CLI.format.json(value, { compact: true, width: 80 })).toBe("{ email: jane@miko.dev, tags: [admin] }")
        expect(CLI.format.json(value, { compact: true, width: 20 })).toBe(lines("email: jane@miko.dev", "tags:", "  - admin"))
    })

    it("should wrap long strings in line with where they start", () => {
        expect(CLI.format.json({ note: "one two three four five six" }, { width: 30 })).toBe(lines(
            "note: one two three four five",
            "      six",
        ))
    })

    it("should cut off long arrays, objects and strings", () => {
        expect(CLI.format.json([1, 2, 3, 4, 5], { maxItems: 3 })).toBe(lines("- 1", "- 2", "- 3", "… 2 more"))
        expect(CLI.format.json({ a: 1, b: 2, c: 3 }, { maxItems: 2 })).toBe(lines("a: 1", "b: 2", "… 1 more"))
        expect(CLI.format.json({ note: "abcdefghij" }, { maxString: 4 })).toBe("note: abcd … 6 more characters")
        expect(CLI.format.json([1, 2, 3], { compact: true, maxItems: 2 })).toBe("[1, 2, … 1 more]")
    })
})
