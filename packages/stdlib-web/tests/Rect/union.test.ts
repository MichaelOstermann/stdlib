import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { union } from "../../src/Rect/union"

describe("union", () => {
    it("creates union of two separate rectangles", () => {
        const a: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const b: Rect = { height: 50, left: 75, top: 75, width: 50 }
        const result = union(a, b)

        expect(result).toEqual({
            height: 125,
            left: 0,
            top: 0,
            width: 125,
        })
    })

    it("returns larger rectangle when one contains the other", () => {
        const a: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const b: Rect = { height: 50, left: 25, top: 25, width: 50 }
        const result = union(a, b)

        expect(result).toEqual(a)
    })

    it("returns same reference for identical rectangles", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = union(rect, rect)

        expect(result).toBe(rect)
    })

    it("handles overlapping rectangles", () => {
        const a: Rect = { height: 75, left: 0, top: 0, width: 75 }
        const b: Rect = { height: 75, left: 50, top: 50, width: 75 }
        const result = union(a, b)

        expect(result).toEqual({
            height: 125,
            left: 0,
            top: 0,
            width: 125,
        })
    })
})
