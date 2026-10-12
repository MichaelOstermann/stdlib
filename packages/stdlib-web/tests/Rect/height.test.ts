import { describe, expect, it } from "bun:test"
import { height } from "../../src/Rect/height"

describe("height", () => {
    it("returns height correctly", () => {
        expect(height({ height: 75, left: 25, top: 50, width: 100 })).toBe(75)
    })
})
