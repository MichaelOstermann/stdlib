import { describe, expect, it } from "bun:test"
import { nearest } from "../../src/DOM/nearest"
import { fakeDOM, fakeElement } from "./helpers"

fakeDOM()

describe("DOM.nearest", () => {
    const pointer = { height: 1, left: 100, top: 100, width: 1 }

    it("should find the element closest to the target", () => {
        const far = fakeElement({ height: 10, left: 0, top: 0, width: 10 })
        const near = fakeElement({ height: 10, left: 120, top: 100, width: 10 })
        expect(nearest([far.element, near.element], pointer)).toBe(near.element)
    })

    it("should find the first element that the target overlaps", () => {
        const a = fakeElement({ height: 50, left: 80, top: 80, width: 50 })
        const b = fakeElement({ height: 50, left: 90, top: 90, width: 50 })
        expect(nearest([a.element, b.element], pointer)).toBe(a.element)
        expect(nearest([b.element, a.element], pointer)).toBe(b.element)
    })

    it("should find nothing without elements", () => {
        expect(nearest([], pointer)).toBeUndefined()
    })
})
