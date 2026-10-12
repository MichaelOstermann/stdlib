import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { takeRightPx } from "../../src/Rect/takeRightPx"

describe("takeRightPx", () => {
    it("takes pixels from right side", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeRightPx(rect, 25)

        expect(result).toEqual({
            height: 75,
            left: 100,
            top: 50,
            width: 25,
        })
    })

    it("clamps amount to rectangle width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeRightPx(rect, 150)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when taking full width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeRightPx(rect, 100)

        expect(result).toBe(rect)
    })
})
