import { describe, expect, it } from "bun:test"
import { width } from "../../src/Rect/width"

describe("width", () => {
    it("returns width correctly", () => {
        expect(width({ height: 75, left: 25, top: 50, width: 100 })).toBe(100)
    })
})
