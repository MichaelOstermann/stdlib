import { describe, expect, it } from "bun:test"
import { roundByDPR } from "../../src/DOM/roundByDPR"
import { fakeDOM, setViewport } from "./helpers"

fakeDOM()

describe("DOM.roundByDPR", () => {
    it("should round to device pixels", () => {
        expect(roundByDPR(10.3)).toBe(10)
        setViewport({ devicePixelRatio: 2 })
        expect(roundByDPR(10.3)).toBe(10.5)
        expect(roundByDPR(10.2)).toBe(10)
        setViewport({ devicePixelRatio: 1.5 })
        expect(roundByDPR(1)).toBeCloseTo(4 / 3)
    })

    it("should round to CSS pixels without a ratio", () => {
        setViewport({ devicePixelRatio: 0 })
        expect(roundByDPR(10.6)).toBe(11)
    })
})
