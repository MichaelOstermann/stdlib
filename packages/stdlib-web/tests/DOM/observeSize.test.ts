import { Effect, Memo, Signal } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { observeSize } from "../../src/DOM/observeSize"
import { origin } from "../../src/Rect/origin"
import { dom, fakeDOM, fakeElement, resize, resizeWindow } from "./helpers"

fakeDOM()

describe("DOM.observeSize", () => {
    it("should return the same signal for the same element", () => {
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const b = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        expect(observeSize(a.element)).toBe(observeSize(a.element))
        expect(observeSize(a.element)).not.toBe(observeSize(b.element))
    })

    it("should measure the layout size, which a scale does not change", () => {
        // Scaled to half: getBoundingClientRect has the drawn size, offsetWidth and offsetHeight the one of the layout.
        const element = { offsetHeight: 100, offsetWidth: 200, getBoundingClientRect: () => ({ height: 50, width: 100 }) } as unknown as Element
        expect(observeSize(element)()).toEqual({ height: 100, left: 0, top: 0, width: 200 })
        const sizes: unknown[] = []
        Effect(() => void sizes.push(observeSize(element)())).dispose()
        expect(sizes).toEqual([{ height: 100, left: 0, top: 0, width: 200 }])
    })

    it("should measure on every read while nothing depends on it", () => {
        const a = fakeElement({ height: 10, left: 5, top: 5, width: 20 })
        const $size = observeSize(a.element)
        expect($size()).toEqual({ height: 10, left: 0, top: 0, width: 20 })
        a.rect.width = 30
        expect($size()).toEqual({ height: 10, left: 0, top: 0, width: 30 })
        expect(dom.resizing.size).toBe(0)
    })

    it("should share one ResizeObserver, and drop it once it observes nothing", () => {
        const globals = globalThis as unknown as { ResizeObserver: new (callback: ResizeObserverCallback) => ResizeObserver }
        const Fake = globals.ResizeObserver
        let created = 0
        globals.ResizeObserver = class extends Fake {
            constructor(callback: ResizeObserverCallback) {
                super(callback)
                created++
            }
        }
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const b = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const first = Effect(() => void observeSize(a.element)())
        const second = Effect(() => void observeSize(b.element)())
        first.dispose()
        Effect(() => void observeSize(a.element)()).dispose()
        expect(created).toBe(1)
        second.dispose()
        Effect(() => void observeSize(a.element)()).dispose()
        expect(created).toBe(2)
    })

    it("should observe the element while an effect depends on it", () => {
        const a = fakeElement({ height: 10, left: 5, top: 5, width: 20 })
        const widths: number[] = []
        const effect = Effect(() => void widths.push(observeSize(a.element)().width))
        expect(dom.resizing.has(a.element)).toBe(true)

        a.rect.width = 30
        resize(a)
        expect(widths).toEqual([20, 30])

        effect.dispose()
        expect(dom.resizing.size).toBe(0)
    })

    it("should not update for the same size", () => {
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const widths: number[] = []
        Effect(() => void widths.push(observeSize(a.element)().width))
        resize(a)
        expect(widths).toEqual([20])
    })

    it("should follow an element that changes, through a memo", () => {
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const b = fakeElement({ height: 40, left: 0, top: 0, width: 50 })
        const $element = Signal<Element | null>(null)
        const $size = Memo(() => observeSize($element())())
        const widths: number[] = []
        Effect(() => void widths.push($size().width))

        $element(a.element)
        a.rect.width = 30
        resize(a)
        expect([...dom.resizing.keys()]).toEqual([a.element])

        $element(b.element)
        expect([...dom.resizing.keys()]).toEqual([b.element])

        $element(null)
        expect(widths).toEqual([0, 20, 30, 50, 0])
        expect(dom.resizing.size).toBe(0)
    })

    it("should be the origin without an element", () => {
        expect(observeSize(null)()).toBe(origin)
        expect(observeSize(null)).toBe(observeSize(null))
    })

    describe("with a window", () => {
        it("should return the same signal for the same window", () => {
            expect(observeSize(window)).toBe(observeSize(window))
            expect(observeSize(window)).not.toBe(observeSize({ innerHeight: 1, innerWidth: 1 } as Window))
        })

        it("should measure on every read while nothing depends on it", () => {
            expect(observeSize(window)()).toEqual({ height: 600, left: 0, top: 0, width: 800 })
            dom.window.innerWidth = 1000
            expect(observeSize(window)()).toEqual({ height: 600, left: 0, top: 0, width: 1000 })
            expect(dom.listeners.size).toBe(0)
        })

        it("should listen to resize while an effect depends on it", () => {
            const widths: number[] = []
            const effect = Effect(() => void widths.push(observeSize(window)().width))
            expect(dom.listeners.size).toBe(1)
            resizeWindow(1000, 700)
            expect(widths).toEqual([800, 1000])
            effect.dispose()
            expect(dom.listeners.size).toBe(0)
        })
    })
})
