import { describe, expect, it } from "bun:test"
import { observePosition } from "../../src/DOM/observePosition"
import { dom, fakeDOM, fakeElement, intersect, resize, setViewport } from "./helpers"

fakeDOM()

describe("DOM.observePosition", () => {
    it("should observe the element until it is stopped", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const lefts: number[] = []
        const stop = observePosition(a.element, (rect) => lefts.push(rect.left))
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
        const stop = observePosition(a.element, (rect) => lefts.push(rect.left))
        resize(a)
        a.rect.left = 5.3
        resize(a)
        a.rect.left = 5.7
        resize(a)
        expect(lefts).toEqual([5, 6])
        stop()
    })

    it("should report a move right away, also when the entry says it is not visible", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const lefts: number[] = []
        const stop = observePosition(a.element, (rect) => lefts.push(rect.left))
        // The entry is from before the move: not visible then, which would wait a second to look again.
        a.rect.left = 50
        intersect(a, 0)
        expect(lefts).toEqual([5, 50])
        stop()
    })

    it("should watch the area of the element again when the viewport changes", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const stop = observePosition(a.element, () => {})
        expect(dom.intersections.get(a.element)!.options.rootMargin).toBe("-6px -775px -584px -5px")
        setViewport({ height: 300, width: 400 })
        expect(dom.intersections.get(a.element)!.options.rootMargin).toBe("-6px -375px -284px -5px")
        stop()
    })

    it("should stop watching the viewport when it is stopped", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const stop = observePosition(a.element, () => {})
        stop()
        setViewport({ height: 300, width: 400 })
        expect(dom.intersecting.size).toBe(0)
    })

    it("should not watch for moves of an element without a size", () => {
        const a = fakeElement({ height: 0, left: 5, top: 6, width: 0 })
        const stop = observePosition(a.element, () => {})
        expect([dom.resizing.has(a.element), dom.intersecting.size]).toEqual([true, 0])
        stop()
    })
})
