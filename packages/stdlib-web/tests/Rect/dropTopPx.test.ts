import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { dropTopPx } from "../../src/Rect/dropTopPx"

describe("dropTopPx", () => {
    it("removes pixels from top and adjusts position", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 100 }
        const result = dropTopPx(rect, 25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 75,
            width: 100,
        })
    })

    it("clamps amount to rectangle height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropTopPx(rect, 100)

        expect(result).toEqual({
            height: 0,
            left: 25,
            top: 125,
            width: 100,
        })
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropTopPx(rect, 0)

        expect(result).toBe(rect)
    })
})
