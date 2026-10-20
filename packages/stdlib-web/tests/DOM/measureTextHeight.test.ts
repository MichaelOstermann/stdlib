import { describe, expect, it } from "bun:test"
import { measureTextHeight } from "../../src/DOM/measureTextHeight"

// happy-dom has no canvas: a font of `n`px has an ascent of `n` and a descent of a quarter of it.
class FakeOffscreenCanvas {
    getContext() {
        return {
            font: "",
            measureText(this: { font: string }) {
                const size = Number.parseFloat(/[\d.]+px/.exec(this.font)![0])
                return { fontBoundingBoxAscent: size, fontBoundingBoxDescent: size / 4 }
            },
        }
    }
}

Object.assign(globalThis, { OffscreenCanvas: FakeOffscreenCanvas })

describe("DOM.measureTextHeight", () => {
    it("should measure the ascent and descent of the font", () => {
        expect(measureTextHeight("16px Inter")).toBe(20)
        expect(measureTextHeight("bold 24px serif")).toBe(30)
    })
})
