import { describe, expect, it } from "bun:test"
import { ci } from "../../../src/CLI/env/ci"

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

describe("CLI.env.ci", () => {
    it("should be on when CI is set", () => {
        expect(withEnv({}, ci)).toBe(false)
        expect(withEnv({ CI: "true" }, ci)).toBe(true)
    })
})
