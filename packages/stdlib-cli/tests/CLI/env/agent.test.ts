import { describe, expect, it } from "bun:test"
import { agent } from "../../../src/CLI/env/agent"

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
        expect(withEnv({}, agent)).toBe(false)
        expect(withEnv({ AI_AGENT: "1" }, agent)).toBe(true)
        expect(withEnv({ CLAUDECODE: "1" }, agent)).toBe(true)
        expect(withEnv({ PATH: "/home/jane/.pi/agent/bin" }, agent)).toBe(true)
        expect(withEnv({ EDITOR: "devin-editor" }, agent)).toBe(true)
    })
})
