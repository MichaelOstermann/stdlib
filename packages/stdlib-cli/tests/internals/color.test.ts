import { describe, expect, it } from "bun:test"
import { detectColor } from "../../src/internals/color"

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

describe("detectColor", () => {
    it("should follow NO_COLOR first, then FORCE_COLOR", () => {
        expect(withEnv({ FORCE_COLOR: "1", NO_COLOR: "1" }, detectColor)).toBe(false)
        expect(withEnv({ AI_AGENT: "1", CI: "true", FORCE_COLOR: "1" }, detectColor)).toBe(true)
    })

    it("should be off for agents, CI and dumb terminals", () => {
        expect(withEnv({ AI_AGENT: "1" }, detectColor)).toBe(false)
        expect(withEnv({ CI: "true" }, detectColor)).toBe(false)
        expect(withEnv({ TERM: "dumb" }, detectColor)).toBe(false)
    })
})
