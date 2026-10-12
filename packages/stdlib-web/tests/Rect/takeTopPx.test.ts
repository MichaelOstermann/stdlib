import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { takeTopPx } from "../../src/Rect/takeTopPx"

describe("takeTopPx", () => {
    it("takes pixels from top", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 100 }
        const result = takeTopPx(rect, 25)

        expect(result).toEqual({
            height: 25,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("clamps amount to rectangle height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeTopPx(rect, 100)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when taking full height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = takeTopPx(rect, 75)

        expect(result).toBe(rect)
    })
})
