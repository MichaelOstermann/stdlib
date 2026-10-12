import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { contains } from "../../src/Rect/contains"

describe("contains", () => {
    it("returns true when a completely contains b", () => {
        const a: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const b: Rect = { height: 50, left: 25, top: 25, width: 50 }
        expect(contains(a, b)).toBe(true)
    })

    it("returns false when b extends outside a", () => {
        const a: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const b: Rect = { height: 75, left: 50, top: 50, width: 75 }
        expect(contains(a, b)).toBe(false)
    })

    it("returns true for identical rectangles", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        expect(contains(rect, rect)).toBe(true)
    })

    it("returns false for zero-sized container with non-zero content", () => {
        const a: Rect = { height: 0, left: 50, top: 50, width: 0 }
        const b: Rect = { height: 25, left: 50, top: 50, width: 25 }
        expect(contains(a, b)).toBe(false)
    })
})
