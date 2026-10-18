import { describe, expect, it } from "bun:test"
import { observePosition } from "../../src/DOM/observePosition"
import { dom, fakeDOM, fakeElement, resize } from "./helpers"

fakeDOM()

describe("DOM.observePosition", () => {
    it("should observe the element until it is stopped", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const lefts: number[] = []
        const stop = observePosition(a.element, rect => lefts.push(rect.left))
        expect([dom.resizing.has(a.element), dom.intersecting.has(a.element)]).toEqual([true, true])

        a.rect.left = 50
        resize(a)
        expect(lefts).toEqual([5, 50])

        stop()
        expect([dom.resizing.size, dom.intersecting.size]).toEqual([0, 0])
    })

    it("should only report a rect that changed in whole pixels", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const lefts: number[] = []
        observePosition(a.element, rect => lefts.push(rect.left))
        resize(a)
        a.rect.left = 5.3
        resize(a)
        a.rect.left = 5.7
        resize(a)
        expect(lefts).toEqual([5, 6])
    })

    it("should not watch for moves of an element without a size", () => {
        const a = fakeElement({ height: 0, left: 5, top: 6, width: 0 })
        observePosition(a.element, () => {})
        expect([dom.resizing.has(a.element), dom.intersecting.size]).toEqual([true, 0])
    })
})
