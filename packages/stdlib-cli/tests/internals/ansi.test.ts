import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

function withColor<T>(color: boolean, fn: () => T): T {
    const saved = CLI.hasColor()
    CLI.setColor(color)
    try {
        return fn()
    }
    finally {
        CLI.setColor(saved)
    }
}

describe("paint", () => {
    it("should only color when CLI.hasColor is on", () => {
        expect(withColor(true, () => CLI.red("x"))).toBe("\x1b[31mx\x1b[39m")
        expect(withColor(false, () => CLI.red("x"))).toBe("x")
    })

    it("should continue a style after a nested one that closes the same way", () => {
        expect(withColor(true, () => CLI.red(`a${CLI.blue("b")}c`))).toBe("\x1b[31ma\x1b[34mb\x1b[31mc\x1b[39m")
    })
})
