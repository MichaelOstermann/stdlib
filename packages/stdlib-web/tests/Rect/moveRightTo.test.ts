import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { moveRightTo } from "../../src/Rect/moveRightTo"

describe("moveRightTo", () => {
    it("moves rectangle so right edge is at specified position", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = moveRightTo(rect, 200)

        expect(result).toEqual({
            height: 75,
            left: 100,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when nothing changed", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = moveRightTo(rect, 125)
        expect(result).toBe(rect)
    })
})
