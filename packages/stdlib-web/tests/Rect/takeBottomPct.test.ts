import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { takeBottomPct } from "../../src/Rect/takeBottomPct"

describe("takeBottomPct", () => {
    it("takes percentage from bottom of rectangle", () => {
        const rect: Rect = { height: 100, left: 25, top: 0, width: 50 }
        const result = takeBottomPct(rect, 0.5)

        expect(result).toEqual({
            height: 50,
            left: 25,
            top: 50,
            width: 50,
        })
    })

    it("clamps percentage to 0-1 range", () => {
        const rect: Rect = { height: 100, left: 0, top: 0, width: 100 }

        const result1 = takeBottomPct(rect, 1.5)
        expect(result1).toEqual(rect)

        const result2 = takeBottomPct(rect, -0.5)
        expect(result2).toEqual({
            height: 0,
            left: 0,
            top: 100,
            width: 100,
        })
    })

    it("returns same reference when taking full height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeBottomPct(rect, 1)

        expect(result).toBe(rect)
    })
})
