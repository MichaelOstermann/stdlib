import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setLeft } from "../../src/Rect/setLeft"

describe("setLeft", () => {
    it("sets left edge and adjusts width", () => {
        const rect: Rect = { height: 75, left: 50, top: 25, width: 100 }
        const result = setLeft(rect, 75)

        expect(result).toEqual({
            height: 75,
            left: 75,
            top: 25,
            width: 75,
        })
    })

    it("handles setting left beyond right edge", () => {
        const rect: Rect = { height: 75, left: 50, top: 25, width: 100 }
        const result = setLeft(rect, 200)

        expect(result).toEqual({
            height: 75,
            left: 150,
            top: 25,
            width: 0,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setLeft(rect, 25)

        expect(result).toBe(rect)
    })
})
