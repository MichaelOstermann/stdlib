import { describe, expect, it } from "bun:test"
import { scrollParent } from "../../src/DOM/scrollParent"
import { fakeDOM } from "./helpers"

fakeDOM()

function tree(...styles: string[]): HTMLElement[] {
    const elements = styles.map((style) => {
        const element = document.createElement("div")
        element.style.cssText = style
        return element
    })
    for (const [index, element] of elements.entries()) (elements[index - 1] ?? document.body).append(element)
    return elements
}

describe("DOM.scrollParent", () => {
    it("should find the closest ancestor that scrolls on the axis", () => {
        const [outer, inner, element] = tree("overflow-y: auto", "overflow-y: scroll", "")
        expect(scrollParent(element!, "y")).toBe(inner!)
        expect(scrollParent(inner!, "y")).toBe(outer!)
    })

    it("should skip ancestors that only scroll on the other axis, or that clip", () => {
        const [outer, , , element] = tree("overflow-x: auto", "overflow-y: auto", "overflow: hidden", "")
        expect(scrollParent(element!, "x")).toBe(outer!)
    })

    it("should not find the element itself, or the page", () => {
        const [element] = tree("overflow: auto")
        expect(scrollParent(element!, "y")).toBeNull()
    })
})
