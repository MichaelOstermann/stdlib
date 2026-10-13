import { Effect, Signal } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { observeSize } from "../../src/DOM/observeSize"
import { dom, fakeDOM, fakeElement, resize } from "./helpers"

fakeDOM()

describe("DOM.observeSize", () => {
    it("should measure on every read while nothing depends on it", () => {
        const a = fakeElement({ height: 10, left: 5, top: 5, width: 20 })
        const $size = observeSize(Signal<Element | null>(a.element))
        expect($size()).toEqual({ height: 10, left: 0, top: 0, width: 20 })
        a.rect.width = 30
        expect($size()).toEqual({ height: 10, left: 0, top: 0, width: 30 })
        expect(dom.resizing.size).toBe(0)
    })

    it("should observe the element while an effect depends on it", () => {
        const a = fakeElement({ height: 10, left: 5, top: 5, width: 20 })
        const $size = observeSize(Signal<Element | null>(a.element))
        const widths: number[] = []
        const effect = Effect(() => void widths.push($size().width))
        expect(dom.resizing.has(a.element)).toBe(true)

        a.rect.width = 30
        resize(a)
        expect(widths).toEqual([20, 30])

        effect.dispose()
        expect(dom.resizing.size).toBe(0)
    })

    it("should not update for the same size", () => {
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const $size = observeSize(Signal<Element | null>(a.element))
        const widths: number[] = []
        Effect(() => void widths.push($size().width))
        resize(a)
        expect(widths).toEqual([20])
    })

    it("should follow the element, and be the origin without one", () => {
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const b = fakeElement({ height: 40, left: 0, top: 0, width: 50 })
        const $element = Signal<Element | null>(null)
        const $size = observeSize($element)
        const widths: number[] = []
        Effect(() => void widths.push($size().width))

        $element(a.element)
        $element(b.element)
        expect(widths).toEqual([0, 20, 50])
        expect([...dom.resizing.keys()]).toEqual([b.element])

        $element(null)
        expect(widths).toEqual([0, 20, 50, 0])
        expect(dom.resizing.size).toBe(0)
    })

    it("should keep observing an element for the signals that are still depended on", () => {
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const $element = Signal<Element | null>(a.element)
        const $one = observeSize($element)
        const $two = observeSize($element)
        const one = Effect(() => void $one())
        const widths: number[] = []
        Effect(() => void widths.push($two().width))

        one.dispose()
        a.rect.width = 30
        resize(a)
        expect(widths).toEqual([20, 30])
    })
})
