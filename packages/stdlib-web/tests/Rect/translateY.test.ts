import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { translateY } from "../../src/Rect/translateY"

describe("translateY", () => {
    it("moves rectangle vertically by amount", () => {
        const rect: Rect = { height: 50, left: 50, top: 75, width: 100 }
        const result = translateY(rect, 25)

        expect(result).toEqual({
            height: 50,
            left: 50,
            top: 100,
            width: 100,
        })
    })

    it("handles negative translation", () => {
        const rect: Rect = { height: 100, left: 50, top: 100, width: 75 }
        const result = translateY(rect, -25)

        expect(result.left).toBe(50)
        expect(result.top).toBe(75)
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = translateY(rect, 0)

        expect(result).toBe(rect)
    })
})
