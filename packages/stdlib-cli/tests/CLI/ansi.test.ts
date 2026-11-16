import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

function withColor<T>(color: boolean, fn: () => T): T {
    const saved = CLI.env.color
    CLI.env.color = color
    try {
        return fn()
    }
    finally {
        CLI.env.color = saved
    }
}

describe("CLI.ansi", () => {
    it("should only color when CLI.env.color is on", () => {
        expect(withColor(true, () => CLI.ansi.red("x"))).toBe("\x1b[31mx\x1b[39m")
        expect(withColor(false, () => CLI.ansi.red("x"))).toBe("x")
    })

    it("should continue a style after a nested one that closes the same way", () => {
        expect(withColor(true, () => CLI.ansi.red(`a${CLI.ansi.blue("b")}c`))).toBe("\x1b[31ma\x1b[34mb\x1b[31mc\x1b[39m")
    })
})
