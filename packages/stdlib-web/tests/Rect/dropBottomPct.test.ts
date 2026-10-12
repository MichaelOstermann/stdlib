import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { dropBottomPct } from "../../src/Rect/dropBottomPct"

describe("dropBottomPct", () => {
    it("removes percentage from bottom of rectangle", () => {
        const rect: Rect = { height: 100, left: 25, top: 0, width: 50 }
        const result = dropBottomPct(rect, 0.25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 0,
            width: 50,
        })
    })

    it("clamps percentage to 0-1 range", () => {
        const rect: Rect = { height: 100, left: 0, top: 0, width: 100 }

        const result1 = dropBottomPct(rect, 1.5)
        expect(result1).toEqual({
            height: 0,
            left: 0,
            top: 0,
            width: 100,
        })

        const result2 = dropBottomPct(rect, -0.5)
        expect(result2).toEqual({
            height: 100,
            left: 0,
            top: 0,
            width: 100,
        })
    })

    it("returns same reference when percentage is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropBottomPct(rect, 0)

        expect(result).toBe(rect)
    })
})
