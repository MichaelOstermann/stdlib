import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { CLI } from "../../src/CLI"

const NAMES = ["AI_AGENT", "CLAUDECODE", "CI", "FORCE_COLOR", "NO_COLOR", "TERM"]

describe("shouldColor", () => {
    let saved: Record<string, string | undefined> = {}

    // The tests themselves may run inside an agent or in CI, and without a terminal.
    beforeEach(() => {
        saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]))
        for (const name of NAMES) delete process.env[name]
    })

    afterEach(() => {
        for (const name of NAMES) {
            if (saved[name] === undefined) delete process.env[name]
            else process.env[name] = saved[name]
        }
    })

    it("is off for NO_COLOR, before anything else", () => {
        process.env["NO_COLOR"] = "1"
        process.env["FORCE_COLOR"] = "1"
        expect(CLI.shouldColor()).toBe(false)
    })

    it("is on for FORCE_COLOR, even for agents and CI", () => {
        process.env["FORCE_COLOR"] = "1"
        process.env["CLAUDECODE"] = "1"
        process.env["CI"] = "true"
        expect(CLI.shouldColor()).toBe(true)
    })

    it("is off for agents and CI", () => {
        process.env["CLAUDECODE"] = "1"
        expect(CLI.shouldColor()).toBe(false)
        delete process.env["CLAUDECODE"]
        process.env["CI"] = "true"
        expect(CLI.shouldColor()).toBe(false)
    })

    it("colors through CLI.red and friends, asked on every call", () => {
        process.env["FORCE_COLOR"] = "1"
        expect(CLI.red("error")).toBe("\x1b[31merror\x1b[39m")
        delete process.env["FORCE_COLOR"]
        process.env["NO_COLOR"] = "1"
        expect(CLI.red("error")).toBe("error")
    })
})
