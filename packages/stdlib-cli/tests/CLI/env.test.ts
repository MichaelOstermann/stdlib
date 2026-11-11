import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

function withEnv<T>(env: Record<string, string>, fn: () => T): T {
    const saved = process.env
    process.env = { PATH: "/usr/bin", ...env }
    try {
        return fn()
    }
    finally {
        process.env = saved
    }
}

describe("CLI.env.agent", () => {
    it("should find agents by their variables", () => {
        expect(withEnv({}, CLI.env.agent)).toBe(false)
        expect(withEnv({ AI_AGENT: "1" }, CLI.env.agent)).toBe(true)
        expect(withEnv({ CLAUDECODE: "1" }, CLI.env.agent)).toBe(true)
        expect(withEnv({ PATH: "/home/jane/.pi/agent/bin" }, CLI.env.agent)).toBe(true)
        expect(withEnv({ EDITOR: "devin-editor" }, CLI.env.agent)).toBe(true)
    })
})

describe("CLI.env.ci", () => {
    it("should be on when CI is set", () => {
        expect(withEnv({}, CLI.env.ci)).toBe(false)
        expect(withEnv({ CI: "true" }, CLI.env.ci)).toBe(true)
    })
})

describe("CLI.env.color", () => {
    it("should follow NO_COLOR first, then FORCE_COLOR", () => {
        expect(withEnv({ FORCE_COLOR: "1", NO_COLOR: "1" }, CLI.env.color)).toBe(false)
        expect(withEnv({ AI_AGENT: "1", CI: "true", FORCE_COLOR: "1" }, CLI.env.color)).toBe(true)
    })

    it("should be off for agents, CI and dumb terminals", () => {
        expect(withEnv({ AI_AGENT: "1" }, CLI.env.color)).toBe(false)
        expect(withEnv({ CI: "true" }, CLI.env.color)).toBe(false)
        expect(withEnv({ TERM: "dumb" }, CLI.env.color)).toBe(false)
    })
})
