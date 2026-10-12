import { describe, expect, it } from "bun:test"
import { isEmpty } from "../../src/Rect/isEmpty"

describe("isEmpty", () => {
    it("returns false for non-empty rectangle", () => {
        expect(isEmpty({ height: 75, left: 25, top: 50, width: 100 })).toBe(false)
    })

    it("returns true for zero width", () => {
        expect(isEmpty({ height: 100, left: 0, top: 0, width: 0 })).toBe(true)
    })

    it("returns true for zero height", () => {
        expect(isEmpty({ height: 0, left: 0, top: 0, width: 100 })).toBe(true)
    })

    it("returns true for zero dimensions", () => {
        expect(isEmpty({ height: 0, left: 50, top: 75, width: 0 })).toBe(true)
    })
})
