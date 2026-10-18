import type { Rect } from "../../src/Rect"
import { describe, expect, it } from "bun:test"
import { observeSize } from "../../src/DOM/observeSize"
import { dom, fakeDOM, fakeElement, resize, setViewport } from "./helpers"

fakeDOM()

describe("DOM.observeSize", () => {
    it("should measure the layout size right away, which a scale does not change", () => {
        // Scaled to half: getBoundingClientRect has the drawn size, offsetWidth and offsetHeight the one of the layout.
        const { element, rect } = fakeElement({ height: 100, left: 0, top: 0, width: 200 })
        element.getBoundingClientRect = () => ({ ...rect, height: 50, width: 100 }) as DOMRect
        const sizes: Rect[] = []
        observeSize(element, size => sizes.push(size))()
        expect(sizes).toEqual([{ height: 100, left: 0, top: 0, width: 200 }])
    })

    it("should observe the element until it is stopped", () => {
        const a = fakeElement({ height: 10, left: 5, top: 5, width: 20 })
        const widths: number[] = []
        const stop = observeSize(a.element, size => widths.push(size.width))
        expect(dom.resizing.has(a.element)).toBe(true)

        a.rect.width = 30
        resize(a)
        expect(widths).toEqual([20, 30])

        stop()
        expect(dom.resizing.size).toBe(0)
    })

    it("should only report a size that changed in whole pixels", () => {
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const widths: number[] = []
        const stop = observeSize(a.element, size => widths.push(size.width))
        resize(a)
        a.rect.width = 20.4
        resize(a)
        a.rect.width = 20.6
        resize(a)
        stop()
        expect(widths).toEqual([20, 21])
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
        const stopA = observeSize(a.element, () => {})
        const stopB = observeSize(b.element, () => {})
        stopA()
        observeSize(a.element, () => {})()
        expect(created).toBe(1)
        stopB()
        observeSize(a.element, () => {})()
        expect(created).toBe(2)
    })

    it("should keep observing an element for another callback", () => {
        const a = fakeElement({ height: 10, left: 0, top: 0, width: 20 })
        const widths: number[] = []
        const stopA = observeSize(a.element, () => {})
        const stopB = observeSize(a.element, size => widths.push(size.width))
        stopA()
        a.rect.width = 30
        resize(a)
        stopB()
        expect(widths).toEqual([20, 30])
    })

    describe("with a window", () => {
        it("should listen to resize until it is stopped", () => {
            const widths: number[] = []
            const stop = observeSize(window, size => widths.push(size.width))
            setViewport({ height: 700, width: 1000 })
            expect(widths).toEqual([800, 1000])
            stop()
            setViewport({ width: 1200 })
            expect(widths).toEqual([800, 1000])
        })
    })
})
