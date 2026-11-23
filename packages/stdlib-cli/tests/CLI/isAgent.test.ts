import { describe, expect, it } from "bun:test"
import { isAgent } from "../../src/CLI/isAgent"

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

describe("CLI.isAgent", () => {
    it("should find agents by their variables", () => {
        expect(withEnv({}, isAgent)).toBe(false)
        expect(withEnv({ AI_AGENT: "1" }, isAgent)).toBe(true)
        expect(withEnv({ CLAUDECODE: "1" }, isAgent)).toBe(true)
        expect(withEnv({ PATH: "/home/jane/.pi/agent/bin" }, isAgent)).toBe(true)
        expect(withEnv({ EDITOR: "devin-editor" }, isAgent)).toBe(true)
    })
})
