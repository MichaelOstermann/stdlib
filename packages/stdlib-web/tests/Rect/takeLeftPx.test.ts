import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { takeLeftPx } from "../../src/Rect/takeLeftPx"

describe("takeLeftPx", () => {
    it("takes pixels from left side", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeLeftPx(rect, 50)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 50,
        })
    })

    it("clamps amount to rectangle width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeLeftPx(rect, 150)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when taking full width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeLeftPx(rect, 100)

        expect(result).toBe(rect)
    })
})
