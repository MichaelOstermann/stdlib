import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { takeLeftPct } from "../../src/Rect/takeLeftPct"

describe("takeLeftPct", () => {
    it("takes percentage from left side", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeLeftPct(rect, 0.5)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 50,
        })
    })

    it("clamps percentage to 0-1 range", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }

        const result1 = takeLeftPct(rect, 1.5)
        expect(result1).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 100,
        })

        const result2 = takeLeftPct(rect, -0.5)
        expect(result2).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 0,
        })
    })

    it("returns same reference when taking full width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeLeftPct(rect, 1)

        expect(result).toBe(rect)
    })
})
