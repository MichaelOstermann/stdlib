import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

describe("CLI.redirectConsole", () => {
    it("should send console.log, info and debug to console.error", () => {
        const saved = { ...console }
        CLI.redirectConsole()
        const { debug, info, log } = console
        expect([log, info, debug]).toEqual([console.error, console.error, console.error])
        Object.assign(console, saved)
    })
})
