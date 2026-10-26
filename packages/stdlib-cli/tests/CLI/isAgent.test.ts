import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { isAgent } from "../../src/CLI/isAgent"

const NAMES = ["AI_AGENT", "CLAUDECODE", "CLAUDE_CODE", "CODEX_THREAD_ID", "CURSOR_AGENT", "EDITOR", "PATH", "TERM_PROGRAM"]

describe("isAgent", () => {
    let saved: Record<string, string | undefined> = {}

    // The tests themselves may run inside an agent.
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

    it("is false without any of the variables", () => {
        expect(isAgent()).toBe(false)
    })

    it("is true for the AI_AGENT convention", () => {
        process.env["AI_AGENT"] = "claude-code_2-1-310_agent"
        expect(isAgent()).toBe(true)
    })

    it("is true for the variable of an agent", () => {
        process.env["CLAUDECODE"] = "1"
        expect(isAgent()).toBe(true)
    })

    it("reads the environment on every call", () => {
        expect(isAgent()).toBe(false)
        process.env["CURSOR_AGENT"] = "1"
        expect(isAgent()).toBe(true)
    })

    it("is true for traces in other variables", () => {
        process.env["PATH"] = "/home/user/.pi/agent/bin:/usr/bin"
        expect(isAgent()).toBe(true)
        process.env["PATH"] = "/usr/bin"
        process.env["EDITOR"] = "devin"
        expect(isAgent()).toBe(true)
    })
})
