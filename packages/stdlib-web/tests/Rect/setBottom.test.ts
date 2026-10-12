import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setBottom } from "../../src/Rect/setBottom"

describe("setBottom", () => {
    it("sets bottom edge and adjusts height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setBottom(rect, 150)

        expect(result).toEqual({
            height: 100,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("handles setting bottom above top", () => {
        const rect: Rect = { height: 75, left: 25, top: 100, width: 100 }
        const result = setBottom(rect, 50)

        expect(result).toEqual({
            height: 0,
            left: 25,
            top: 100,
            width: 100,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setBottom(rect, 125)

        expect(result).toBe(rect)
    })
})
