import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { takeRightPct } from "../../src/Rect/takeRightPct"

describe("takeRightPct", () => {
    it("takes percentage from right side", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeRightPct(rect, 0.5)

        expect(result).toEqual({
            height: 75,
            left: 75,
            top: 50,
            width: 50,
        })
    })

    it("clamps percentage to 0-1 range", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }

        const result1 = takeRightPct(rect, 1.5)
        expect(result1).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 100,
        })

        const result2 = takeRightPct(rect, -0.5)
        expect(result2).toEqual({
            height: 75,
            left: 125,
            top: 50,
            width: 0,
        })
    })

    it("returns same reference when taking full width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeRightPct(rect, 1)

        expect(result).toBe(rect)
    })
})
