import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { scaleX } from "../../src/Rect/scaleX"

describe("scaleX", () => {
    it("scales rectangle horizontally around center", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scaleX(rect, 2)

        expect(result).toEqual({
            height: 100,
            left: 0,
            top: 50,
            width: 200,
        })
    })

    it("returns same reference when factor is 1", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = scaleX(rect, 1)

        expect(result).toBe(rect)
    })

    it("clamps negative factors to zero", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scaleX(rect, -1)

        expect(result).toEqual({
            height: 100,
            left: 100,
            top: 50,
            width: 0,
        })
    })

    it("handles zero scale factor", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scaleX(rect, 0)

        expect(result).toEqual({
            height: 100,
            left: 100,
            top: 50,
            width: 0,
        })
    })
})
