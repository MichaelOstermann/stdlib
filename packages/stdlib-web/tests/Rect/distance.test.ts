import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { distance } from "../../src/Rect/distance"

describe("distance", () => {
    it("calculates distance between separated rectangles", () => {
        const a: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const b: Rect = { height: 50, left: 100, top: 0, width: 50 }
        const result = distance(a, b)

        expect(result).toBe(50)
    })

    it("returns zero for intersecting rectangles", () => {
        const a: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const b: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = distance(a, b)

        expect(result).toBe(0)
    })

    it("returns zero for touching rectangles", () => {
        const a: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const b: Rect = { height: 50, left: 50, top: 0, width: 50 }
        const result = distance(a, b)

        expect(result).toBe(0)
    })

    it("calculates diagonal distance", () => {
        const a: Rect = { height: 25, left: 0, top: 0, width: 25 }
        const b: Rect = { height: 25, left: 100, top: 100, width: 25 }
        const result = distance(a, b)

        expect(result).toBeCloseTo(106.07)
    })

    it("calculates the shortest distance between the closest edges", () => {
        const a: Rect = { height: 10, left: 0, top: 0, width: 10 }
        const b: Rect = { height: 10, left: 40, top: 20, width: 10 }

        expect(distance(a, b)).toBeCloseTo(Math.hypot(30, 10))
        expect(distance(b, a)).toBeCloseTo(Math.hypot(30, 10))
    })

    it("supports rectangles without a size", () => {
        const a: Rect = { height: 0, left: 0, top: 0, width: 0 }
        const b: Rect = { height: 10, left: 30, top: 40, width: 10 }

        expect(distance(a, b)).toBe(50)
        expect(distance(a, a)).toBe(0)
    })

    it("calculates diagonal distance when a is upper-right of b", () => {
        const a: Rect = { height: 25, left: 100, top: 0, width: 25 }
        const b: Rect = { height: 25, left: 0, top: 100, width: 25 }
        const result = distance(a, b)

        expect(result).toBeCloseTo(106.07)
    })
})
