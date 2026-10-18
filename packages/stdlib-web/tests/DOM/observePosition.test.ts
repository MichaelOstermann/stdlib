import { Effect } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { observePosition } from "../../src/DOM/observePosition"
import { origin } from "../../src/Rect/origin"
import { dom, fakeDOM, fakeElement, resize } from "./helpers"

fakeDOM()

describe("DOM.observePosition", () => {
    it("should return the same signal for the same element", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const b = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        expect(observePosition(a.element)).toBe(observePosition(a.element))
        expect(observePosition(a.element)).not.toBe(observePosition(b.element))
    })

    it("should measure on every read while nothing depends on it", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const $rect = observePosition(a.element)
        expect($rect()).toEqual({ height: 10, left: 5, top: 6, width: 20 })
        a.rect.left = 50
        expect($rect()).toEqual({ height: 10, left: 50, top: 6, width: 20 })
        expect([dom.resizing.size, dom.intersecting.size]).toEqual([0, 0])
    })

    it("should observe the element while an effect depends on it", () => {
        const a = fakeElement({ height: 10, left: 5, top: 6, width: 20 })
        const lefts: number[] = []
        const effect = Effect(() => void lefts.push(observePosition(a.element)().left))
        expect([dom.resizing.has(a.element), dom.intersecting.has(a.element)]).toEqual([true, true])

        a.rect.left = 50
        resize(a)
        expect(lefts).toEqual([5, 50])

        effect.dispose()
        expect([dom.resizing.size, dom.intersecting.size]).toEqual([0, 0])
    })

    it("should not watch for moves of an element without a size", () => {
        const a = fakeElement({ height: 0, left: 5, top: 6, width: 0 })
        Effect(() => void observePosition(a.element)())
        expect([dom.resizing.has(a.element), dom.intersecting.size]).toEqual([true, 0])
    })

    it("should be the origin without an element", () => {
        expect(observePosition(null)()).toBe(origin)
    })
})
