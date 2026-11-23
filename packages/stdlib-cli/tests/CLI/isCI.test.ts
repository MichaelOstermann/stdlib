import { describe, expect, it } from "bun:test"
import { isCI } from "../../src/CLI/isCI"

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

describe("CLI.isCI", () => {
    it("should be on when CI is set", () => {
        expect(withEnv({}, isCI)).toBe(false)
        expect(withEnv({ CI: "true" }, isCI)).toBe(true)
    })
})
