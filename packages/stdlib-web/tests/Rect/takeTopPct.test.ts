import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { takeTopPct } from "../../src/Rect/takeTopPct"

describe("takeTopPct", () => {
    it("takes percentage from top of rectangle", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 100 }
        const result = takeTopPct(rect, 0.25)

        expect(result).toEqual({
            height: 25,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("clamps percentage to 0-1 range", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 100 }

        const result1 = takeTopPct(rect, 1.5)
        expect(result1).toEqual({
            height: 100,
            left: 25,
            top: 50,
            width: 100,
        })

        const result2 = takeTopPct(rect, -0.5)
        expect(result2).toEqual({
            height: 0,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when taking full height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeTopPct(rect, 1)

        expect(result).toBe(rect)
    })
})
