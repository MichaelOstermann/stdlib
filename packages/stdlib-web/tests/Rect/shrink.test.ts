import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { shrink } from "../../src/Rect/shrink"

describe("shrink", () => {
    it("shrinks rectangle from all edges", () => {
        const rect: Rect = { height: 150, left: 25, top: 25, width: 150 }
        const result = shrink(rect, 25)

        expect(result).toEqual({
            height: 100,
            left: 50,
            top: 50,
            width: 100,
        })
    })

    it("prevents negative dimensions", () => {
        const rect: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const result = shrink(rect, 75)

        expect(result.width).toBeGreaterThanOrEqual(0)
        expect(result.height).toBeGreaterThanOrEqual(0)
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = shrink(rect, 0)
        expect(result).toBe(rect)
    })
})
