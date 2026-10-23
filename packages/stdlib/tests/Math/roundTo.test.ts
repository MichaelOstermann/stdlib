import { describe, expect, it } from "bun:test"
import { roundTo } from "../../src/Math/roundTo"

describe("Math.roundTo", () => {
    it("should round to decimal places", () => {
        expect(roundTo(3.14159, 2)).toBe(3.14)
        expect(roundTo(3.14159, 4)).toBe(3.1416)
        expect(roundTo(3, 2)).toBe(3)
    })

    it("should round half up like Math.round", () => {
        expect(roundTo(2.5, 0)).toBe(3)
        expect(roundTo(-2.5, 0)).toBe(-2)
        expect(roundTo(0.125, 2)).toBe(0.13)
    })

    it("should round to tens and more with negative digits", () => {
        expect(roundTo(1234, -2)).toBe(1200)
        expect(roundTo(1250, -2)).toBe(1300)
    })
})
