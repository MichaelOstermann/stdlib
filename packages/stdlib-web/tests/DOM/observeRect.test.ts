import { Effect, Signal } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { observeRect } from "../../src/DOM/observeRect"
import { origin } from "../../src/Rect/origin"
import { dom, fakeDOM, fakeElement, resize } from "./helpers"

fakeDOM()

describe("DOM.observeRect", () => {
    it("should measure on every read while nothing depends on it", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const $rect = observeRect(Signal<Element | null>(a.element))
        expect($rect()).toEqual({ height: 10, left: 5, top: 6, width: 20 })
        a.rect.left = 50
        expect($rect()).toEqual({ height: 10, left: 50, top: 6, width: 20 })
        expect([dom.resizing.size, dom.intersecting.size]).toEqual([0, 0])
    })

    it("should observe the element while an effect depends on it", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const $rect = observeRect(Signal<Element | null>(a.element))
        const lefts: number[] = []
        const effect = Effect(() => void lefts.push($rect().left))
        expect([dom.resizing.has(a.element), dom.intersecting.has(a.element)]).toEqual([true, true])

        a.rect.left = 50
        resize(a)
        expect(lefts).toEqual([5, 50])

        effect.dispose()
        expect([dom.resizing.size, dom.intersecting.size]).toEqual([0, 0])
    })

    it("should not watch for moves of an element without a size", () => {
        const a = fakeElement({ height: 0, left: 5, top: 6, width: 0 })
        const $rect = observeRect(Signal<Element | null>(a.element))
        Effect(() => void $rect())
        expect([dom.resizing.has(a.element), dom.intersecting.size]).toEqual([true, 0])
    })

    it("should be the origin without an element", () => {
        const $element = Signal<Element | null>(null)
        const $rect = observeRect($element)
        expect($rect()).toBe(origin)
        const rects: unknown[] = []
        Effect(() => void rects.push($rect()))
        $element(fakeElement({ height: 1, left: 2, top: 3, width: 4 }).element)
        expect(rects).toEqual([origin, { height: 1, left: 2, top: 3, width: 4 }])
    })
})
