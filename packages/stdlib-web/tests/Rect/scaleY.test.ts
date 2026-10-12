import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { scaleY } from "../../src/Rect/scaleY"

describe("scaleY", () => {
    it("scales rectangle vertically around center", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scaleY(rect, 2)

        expect(result).toEqual({
            height: 200,
            left: 50,
            top: 0,
            width: 100,
        })
    })

    it("returns same reference when factor is 1", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = scaleY(rect, 1)

        expect(result).toBe(rect)
    })

    it("clamps negative factors to zero", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scaleY(rect, -1)

        expect(result).toEqual({
            height: 0,
            left: 50,
            top: 100,
            width: 100,
        })
    })

    it("handles zero scale factor", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = scaleY(rect, 0)

        expect(result).toEqual({
            height: 0,
            left: 50,
            top: 100,
            width: 100,
        })
    })
})
