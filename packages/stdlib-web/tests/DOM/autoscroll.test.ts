import { describe, expect, it } from "bun:test"
import { autoscroll } from "../../src/DOM/autoscroll"
import { fakeDOM, fakeElement, fakeFrames, frames, scrollable } from "./helpers"

fakeDOM()
fakeFrames()

function move(x: number, y: number): void {
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y }))
}

describe("DOM.autoscroll", () => {
    it("should scroll faster the closer the pointer is to an edge", () => {
        const container = scrollable(fakeElement({ height: 400, left: 0, top: 0, width: 400 }).element, { height: 1000 })
        const stop = autoscroll(() => [container])

        move(200, 350)
        frames.run()
        expect(container.scrollTop).toBe(5)
        move(200, 399)
        frames.run()
        expect(container.scrollTop).toBe(5 + 20)
        move(200, 200)
        frames.run()
        expect(container.scrollTop).toBe(25)
        stop()
    })

    it("should scroll towards the edge, on both axes", () => {
        const container = scrollable(fakeElement({ height: 400, left: 0, top: 0, width: 400 }).element, { height: 1000, width: 1000 })
        container.scrollLeft = 100
        container.scrollTop = 100
        const stop = autoscroll(() => [container])
        move(0, 0)
        frames.run()
        expect([container.scrollLeft, container.scrollTop]).toEqual([80, 80])
        stop()
    })

    it("should scroll within the edge, at the speed", () => {
        const container = scrollable(fakeElement({ height: 400, left: 0, top: 0, width: 400 }).element, { height: 1000 })
        const stop = autoscroll(() => [container], { edge: 50, speed: 40 })
        move(200, 340)
        frames.run()
        expect(container.scrollTop).toBe(0)
        move(200, 375)
        frames.run()
        expect(container.scrollTop).toBe(10)
        stop()
    })

    it("should only scroll containers that the pointer is inside of", () => {
        const container = scrollable(fakeElement({ height: 400, left: 0, top: 0, width: 400 }).element, { height: 1000 })
        const stop = autoscroll(() => [container])
        move(200, 450)
        frames.run()
        expect(container.scrollTop).toBe(0)
        stop()
    })

    it("should call onScroll after frames that scrolled", () => {
        const container = scrollable(fakeElement({ height: 400, left: 0, top: 0, width: 400 }).element, { height: 15 })
        let scrolls = 0
        const stop = autoscroll(() => [container], { onScroll: () => scrolls++ })
        move(200, 399)
        frames.run()
        frames.run()
        expect([container.scrollTop, scrolls]).toEqual([15, 1])
        stop()
    })

    it("should not scroll before the pointer moved, or once stopped", () => {
        const container = scrollable(fakeElement({ height: 400, left: 0, top: 0, width: 400 }).element, { height: 1000 })
        const stop = autoscroll(() => [container])
        frames.run()
        expect(container.scrollTop).toBe(0)
        stop()
        move(200, 399)
        frames.run()
        expect([container.scrollTop, frames.callbacks.size]).toEqual([0, 0])
    })
})
