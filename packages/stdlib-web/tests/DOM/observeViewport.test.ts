import { Effect } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { observeViewport } from "../../src/DOM/observeViewport"
import { dom, fakeDOM, resizeWindow } from "./helpers"

fakeDOM()

describe("DOM.observeViewport", () => {
    it("should return the same signal every time", () => {
        expect(observeViewport()).toBe(observeViewport())
    })

    it("should measure on every read while nothing depends on it", () => {
        expect(observeViewport()()).toEqual({ height: 600, left: 0, top: 0, width: 800 })
        dom.window.innerWidth = 1000
        expect(observeViewport()()).toEqual({ height: 600, left: 0, top: 0, width: 1000 })
        expect(dom.listeners.size).toBe(0)
    })

    it("should listen to resize while an effect depends on it", () => {
        const widths: number[] = []
        const effect = Effect(() => void widths.push(observeViewport()().width))
        expect(dom.listeners.size).toBe(1)
        resizeWindow(1000, 700)
        expect(widths).toEqual([800, 1000])
        effect.dispose()
        expect(dom.listeners.size).toBe(0)
    })
})
