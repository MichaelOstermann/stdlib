import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { dropLeftPct } from "../../src/Rect/dropLeftPct"

describe("dropLeftPct", () => {
    it("removes percentage from left and adjusts position", () => {
        const rect: Rect = { height: 75, left: 0, top: 25, width: 100 }
        const result = dropLeftPct(rect, 0.25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 25,
            width: 75,
        })
    })

    it("clamps percentage to 0-1 range", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }

        const result1 = dropLeftPct(rect, 1.5)
        expect(result1).toEqual({
            height: 100,
            left: 150,
            top: 50,
            width: 0,
        })

        const result2 = dropLeftPct(rect, -0.5)
        expect(result2).toEqual({
            height: 100,
            left: 50,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when percentage is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropLeftPct(rect, 0)

        expect(result).toBe(rect)
    })
})
