import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { isEqual } from "../../src/Rect/isEqual"

describe("isEqual", () => {
    it("returns true for identical rectangles", () => {
        const a: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const b: Rect = { height: 75, left: 25, top: 50, width: 100 }
        expect(isEqual(a, b)).toBe(true)
    })

    it("returns false for different rectangles", () => {
        const a: Rect = { height: 75, left: 25, top: 50, width: 100 }
        expect(isEqual(a, { height: 75, left: 26, top: 50, width: 100 })).toBe(false)
        expect(isEqual(a, { height: 75, left: 25, top: 51, width: 100 })).toBe(false)
        expect(isEqual(a, { height: 75, left: 25, top: 50, width: 101 })).toBe(false)
        expect(isEqual(a, { height: 76, left: 25, top: 50, width: 100 })).toBe(false)
    })
})
