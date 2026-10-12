import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { translateX } from "../../src/Rect/translateX"

describe("translateX", () => {
    it("moves rectangle horizontally by amount", () => {
        const rect: Rect = { height: 50, left: 50, top: 75, width: 100 }
        const result = translateX(rect, 25)

        expect(result).toEqual({
            height: 50,
            left: 75,
            top: 75,
            width: 100,
        })
    })

    it("handles negative translation", () => {
        const rect: Rect = { height: 100, left: 100, top: 50, width: 75 }
        const result = translateX(rect, -25)

        expect(result.left).toBe(75)
        expect(result.top).toBe(50)
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = translateX(rect, 0)

        expect(result).toBe(rect)
    })
})
