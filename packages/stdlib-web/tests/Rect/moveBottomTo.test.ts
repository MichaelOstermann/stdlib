import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { moveBottomTo } from "../../src/Rect/moveBottomTo"

describe("moveBottomTo", () => {
    it("moves rectangle so bottom edge is at specified position", () => {
        const rect: Rect = { height: 100, left: 50, top: 25, width: 75 }
        const result = moveBottomTo(rect, 150)

        expect(result).toEqual({
            height: 100,
            left: 50,
            top: 50,
            width: 75,
        })
    })

    it("returns same reference when nothing changed", () => {
        const rect: Rect = { height: 100, left: 50, top: 25, width: 75 }
        const result = moveBottomTo(rect, 125)
        expect(result).toBe(rect)
    })
})
