import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

describe("CLI.string", () => {
    it("should return a new option each time", () => {
        const base = CLI.string()
        const optional = base.optional(true)
        expect(base.config.optional).toBe(false)
        expect(optional.config.optional).toBe(true)
    })

    it("should keep the default as it is for undefined, and take an empty string", () => {
        expect(CLI.string().default(undefined).config.default).toBeUndefined()
        expect(CLI.string().default("1").default(undefined).config.default).toBe("1")
        expect(CLI.string().default("").config.default).toBe("")
    })
})
