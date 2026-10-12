import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { dropLeftPx } from "../../src/Rect/dropLeftPx"

describe("dropLeftPx", () => {
    it("removes pixels from left and adjusts position", () => {
        const rect: Rect = { height: 75, left: 0, top: 25, width: 100 }
        const result = dropLeftPx(rect, 25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 25,
            width: 75,
        })
    })

    it("clamps amount to rectangle width", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = dropLeftPx(rect, 150)

        expect(result).toEqual({
            height: 100,
            left: 150,
            top: 50,
            width: 0,
        })
    })

    it("handles zero amount", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = dropLeftPx(rect, 0)
        expect(result).toBe(rect)
    })
})
