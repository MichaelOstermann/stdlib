import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { intersection } from "../../src/Rect/intersection"

describe("intersection", () => {
    it("calculates intersection of overlapping rectangles", () => {
        const a: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const b: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = intersection(a, b)

        expect(result).toEqual({
            height: 50,
            left: 50,
            top: 50,
            width: 50,
        })
    })

    it("returns origin for non-intersecting rectangles", () => {
        const a: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const b: Rect = { height: 50, left: 100, top: 100, width: 50 }
        const result = intersection(a, b)

        expect(result).toEqual({ height: 0, left: 0, top: 0, width: 0 })
    })

    it("returns smaller rectangle when one contains the other", () => {
        const a: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const b: Rect = { height: 50, left: 25, top: 25, width: 50 }
        const result = intersection(a, b)

        expect(result).toEqual(b)
    })

    it("returns same reference for identical rectangles", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = intersection(rect, rect)

        expect(result).toBe(rect)
    })
})
