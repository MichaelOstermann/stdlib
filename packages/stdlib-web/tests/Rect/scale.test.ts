import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { scale } from "../../src/Rect/scale"

describe("scale", () => {
    it("scales rectangle around its center", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scale(rect, 2)

        expect(result).toEqual({
            height: 200,
            left: 0,
            top: 0,
            width: 200,
        })
    })

    it("handles scale factor of 1", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = scale(rect, 1)
        expect(result).toBe(rect)
    })

    it("clamps negative scale factors to zero", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scale(rect, -1)

        expect(result).toEqual({
            height: 0,
            left: 100,
            top: 100,
            width: 0,
        })
    })

    it("handles zero scale factor", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scale(rect, 0)

        expect(result).toEqual({
            height: 0,
            left: 100,
            top: 100,
            width: 0,
        })
    })
})
