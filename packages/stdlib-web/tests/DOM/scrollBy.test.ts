import { describe, expect, it } from "bun:test"
import { scrollBy } from "../../src/DOM/scrollBy"
import { fakeDOM, fakeFrames, frames, scrollable } from "./helpers"

fakeDOM()
fakeFrames()

describe("DOM.scrollBy", () => {
    it("should scroll over the duration, eased like CSS's ease", () => {
        const element = scrollable(document.createElement("div"), { width: 1000 })
        let done = false
        scrollBy(element, { duration: 100, x: 100, onDone: () => done = true })
        frames.run(0)
        expect(element.scrollLeft).toBe(0)
        frames.run(50)
        // cubic-bezier(0.25, 0.1, 0.25, 1) is at 0.8024 halfway.
        expect(element.scrollLeft).toBeCloseTo(80.24, 1)
        expect(done).toBe(false)
        frames.run(50)
        expect([element.scrollLeft, done]).toEqual([100, true])
        expect(frames.callbacks.size).toBe(0)
    })

    it("should scroll with the easing", () => {
        const element = scrollable(document.createElement("div"), { height: 1000 })
        scrollBy(element, { duration: 100, y: 100, easing: progress => progress })
        frames.run(25)
        expect(element.scrollTop).toBe(25)
    })

    it("should scroll both axes, as far as they can", () => {
        const element = scrollable(document.createElement("div"), { height: 1000, width: 30 })
        element.scrollTop = 500
        scrollBy(element, { duration: 100, x: 100, y: -600 })
        frames.run(100)
        expect([element.scrollLeft, element.scrollTop]).toEqual([30, 0])
    })

    it("should be done right away without a distance", () => {
        const element = scrollable(document.createElement("div"), {})
        let done = false
        scrollBy(element, { duration: 100, y: 100, onDone: () => done = true })
        expect([done, frames.callbacks.size]).toEqual([true, 0])
    })

    it("should scroll right away without a duration", () => {
        const element = scrollable(document.createElement("div"), { height: 1000 })
        let done = false
        scrollBy(element, { duration: 0, y: 100, onDone: () => done = true })
        expect([element.scrollTop, done]).toEqual([100, true])
    })

    it("should stop where it is when cancelled, without being done", () => {
        const element = scrollable(document.createElement("div"), { height: 1000 })
        let done = false
        const cancel = scrollBy(element, { duration: 100, y: 100, onDone: () => done = true })
        frames.run(50)
        cancel()
        frames.run(50)
        expect(element.scrollTop).toBeCloseTo(80.24, 1)
        expect(done).toBe(false)
    })
})
