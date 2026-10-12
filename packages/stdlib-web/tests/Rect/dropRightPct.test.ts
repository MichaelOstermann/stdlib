import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { dropRightPct } from "../../src/Rect/dropRightPct"

describe("dropRightPct", () => {
    it("removes percentage from right side", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropRightPct(rect, 0.25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 75,
        })
    })

    it("clamps percentage to 0-1 range", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 100 }

        const result1 = dropRightPct(rect, 1.5)
        expect(result1).toEqual({
            height: 100,
            left: 25,
            top: 50,
            width: 0,
        })

        const result2 = dropRightPct(rect, -0.5)
        expect(result2).toEqual({
            height: 100,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when percentage is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropRightPct(rect, 0)

        expect(result).toBe(rect)
    })
})
