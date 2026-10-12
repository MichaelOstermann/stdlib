import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { dropRightPx } from "../../src/Rect/dropRightPx"

describe("dropRightPx", () => {
    it("removes pixels from right side", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropRightPx(rect, 25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 75,
        })
    })

    it("clamps amount to rectangle width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropRightPx(rect, 150)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 0,
        })
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropRightPx(rect, 0)

        expect(result).toBe(rect)
    })
})
