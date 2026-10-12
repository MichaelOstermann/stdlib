import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { shrinkX } from "../../src/Rect/shrinkX"

describe("shrinkX", () => {
    it("shrinks rectangle horizontally", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 150 }
        const result = shrinkX(rect, 25)

        expect(result).toEqual({
            height: 100,
            left: 50,
            top: 50,
            width: 100,
        })
    })

    it("prevents negative width", () => {
        const rect: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const result = shrinkX(rect, 75)

        expect(result.width).toBeGreaterThanOrEqual(0)
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = shrinkX(rect, 0)

        expect(result).toBe(rect)
    })
})
