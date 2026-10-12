import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setRight } from "../../src/Rect/setRight"

describe("setRight", () => {
    it("sets right edge and adjusts width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setRight(rect, 175)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 150,
        })
    })

    it("handles setting right before left", () => {
        const rect: Rect = { height: 75, left: 100, top: 50, width: 100 }
        const result = setRight(rect, 50)

        expect(result).toEqual({
            height: 75,
            left: 100,
            top: 50,
            width: 0,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setRight(rect, 125)

        expect(result).toBe(rect)
    })
})
