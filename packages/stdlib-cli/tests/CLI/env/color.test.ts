import { describe, expect, it } from "bun:test"
import { color } from "../../../src/CLI/env/color"

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

describe("CLI.env.color", () => {
    it("should follow NO_COLOR first, then FORCE_COLOR", () => {
        expect(withEnv({ FORCE_COLOR: "1", NO_COLOR: "1" }, color)).toBe(false)
        expect(withEnv({ AI_AGENT: "1", CI: "true", FORCE_COLOR: "1" }, color)).toBe(true)
    })

    it("should be off for agents, CI and dumb terminals", () => {
        expect(withEnv({ AI_AGENT: "1" }, color)).toBe(false)
        expect(withEnv({ CI: "true" }, color)).toBe(false)
        expect(withEnv({ TERM: "dumb" }, color)).toBe(false)
    })
})
