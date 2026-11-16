import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

describe("CLI.boolean", () => {
    it("should be off by default", () => {
        expect(CLI.boolean().config.default).toBe(false)
        expect(CLI.boolean().default(true).config.default).toBe(true)
    })
})
