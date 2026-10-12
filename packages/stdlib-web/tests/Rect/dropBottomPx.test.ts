import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { dropBottomPx } from "../../src/Rect/dropBottomPx"

describe("dropBottomPx", () => {
    it("removes pixels from bottom", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 100 }
        const result = dropBottomPx(rect, 25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("clamps amount to rectangle height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropBottomPx(rect, 100)

        expect(result).toEqual({
            height: 0,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropBottomPx(rect, 0)

        expect(result).toBe(rect)
    })
})
