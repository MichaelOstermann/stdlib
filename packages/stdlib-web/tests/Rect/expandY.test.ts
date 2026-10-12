import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { expandY } from "../../src/Rect/expandY"

describe("expandY", () => {
    it("expands rectangle vertically", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = expandY(rect, 25)

        expect(result).toEqual({
            height: 150,
            left: 50,
            top: 25,
            width: 100,
        })
    })

    it("clamps negative amounts to zero", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = expandY(rect, -25)

        expect(result).toBe(rect)
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = expandY(rect, 0)

        expect(result).toBe(rect)
    })
})
