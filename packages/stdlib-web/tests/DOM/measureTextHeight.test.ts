import { describe, expect, it, spyOn } from "bun:test"
import { measureTextHeight } from "../../src/DOM/measureTextHeight"
import { fakeDOM } from "./helpers"

fakeDOM()

describe("DOM.measureTextHeight", () => {
    it("should measure inline text inside the parent, and remove it again", () => {
        const parent = document.createElement("div")
        document.body.append(parent)
        const measured: { parent: Element | null, tagName: string }[] = []
        const spy = spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
            measured.push({ parent: this.parentElement!.parentElement, tagName: this.tagName })
            return { height: Number.parseFloat(this.parentElement!.style.fontSize) * 1.2 } as DOMRect
        })

        expect(measureTextHeight(10, parent)).toBe(12)
        expect(measured).toEqual([{ parent, tagName: "SPAN" }])
        expect(parent.childElementCount).toBe(0)

        expect(measureTextHeight(20)).toBe(24)
        expect(document.body.childElementCount).toBe(1)
        spy.mockRestore()
    })
})
