import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { intersects } from "../../src/Rect/intersects"

describe("intersects", () => {
    it("returns true for overlapping rectangles", () => {
        const a: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const b: Rect = { height: 100, left: 50, top: 50, width: 100 }
        expect(intersects(a, b)).toBe(true)
    })

    it("returns false for non-overlapping rectangles", () => {
        const a: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const b: Rect = { height: 50, left: 100, top: 100, width: 50 }
        expect(intersects(a, b)).toBe(false)
    })

    it("returns false for touching rectangles", () => {
        const a: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const b: Rect = { height: 50, left: 50, top: 0, width: 50 }
        expect(intersects(a, b)).toBe(false)
    })

    it("returns true for identical rectangles", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        expect(intersects(rect, rect)).toBe(true)
    })
})
