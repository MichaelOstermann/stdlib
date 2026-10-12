import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { translate } from "../../src/Rect/translate"

describe("translate", () => {
    it("moves rectangle by amount in both directions", () => {
        const rect: Rect = { height: 50, left: 50, top: 75, width: 100 }
        const result = translate(rect, 25)

        expect(result).toEqual({
            height: 50,
            left: 75,
            top: 100,
            width: 100,
        })
    })

    it("handles negative translation", () => {
        const rect: Rect = { height: 50, left: 100, top: 100, width: 50 }
        const result = translate(rect, -25)

        expect(result).toEqual({
            height: 50,
            left: 75,
            top: 75,
            width: 50,
        })
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = translate(rect, 0)
        expect(result).toBe(rect)
    })
})
