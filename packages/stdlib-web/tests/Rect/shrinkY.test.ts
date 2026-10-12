import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { shrinkY } from "../../src/Rect/shrinkY"

describe("shrinkY", () => {
    it("shrinks rectangle vertically", () => {
        const rect: Rect = { height: 150, left: 50, top: 25, width: 100 }
        const result = shrinkY(rect, 25)

        expect(result).toEqual({
            height: 100,
            left: 50,
            top: 50,
            width: 100,
        })
    })

    it("prevents negative height", () => {
        const rect: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const result = shrinkY(rect, 75)

        expect(result.height).toBeGreaterThanOrEqual(0)
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = shrinkY(rect, 0)

        expect(result).toBe(rect)
    })
})
