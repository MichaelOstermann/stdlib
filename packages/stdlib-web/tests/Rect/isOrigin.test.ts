import { describe, expect, it } from "bun:test"
import { isOrigin } from "../../src/Rect/isOrigin"

describe("isOrigin", () => {
    it("returns true for origin rectangle", () => {
        expect(isOrigin({ height: 0, left: 0, top: 0, width: 0 })).toBe(true)
    })

    it("returns false for non-origin rectangles", () => {
        expect(isOrigin({ height: 0, left: 25, top: 0, width: 0 })).toBe(false)
        expect(isOrigin({ height: 0, left: 0, top: 25, width: 0 })).toBe(false)
        expect(isOrigin({ height: 0, left: 0, top: 0, width: 25 })).toBe(false)
        expect(isOrigin({ height: 25, left: 0, top: 0, width: 0 })).toBe(false)
    })
})
