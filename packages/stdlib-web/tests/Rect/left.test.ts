import { describe, expect, it } from "bun:test"
import { left } from "../../src/Rect/left"

describe("left", () => {
    it("returns left correctly", () => {
        expect(left({ height: 75, left: 25, top: 50, width: 100 })).toBe(25)
    })
})
