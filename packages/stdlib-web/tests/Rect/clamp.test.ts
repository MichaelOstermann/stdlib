import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { clamp } from "../../src/Rect/clamp"

describe("clamp", () => {
    it("clamps target within source bounds", () => {
        const target: Rect = { height: 125, left: -25, top: -25, width: 150 }
        const source: Rect = { height: 75, left: 0, top: 0, width: 100 }
        const result = clamp(target, source)

        expect(result).toEqual({
            height: 75,
            left: 0,
            top: 0,
            width: 100,
        })
    })

    it("returns target unchanged if already within bounds", () => {
        const target: Rect = { height: 25, left: 25, top: 25, width: 50 }
        const source: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const result = clamp(target, source)

        expect(result).toBe(target)
    })

    it("handles target extending beyond source boundaries", () => {
        const target: Rect = { height: 75, left: 50, top: 50, width: 100 }
        const source: Rect = { height: 50, left: 0, top: 0, width: 75 }
        const result = clamp(target, source)

        expect(result).toEqual({
            height: 50,
            left: 0,
            top: 0,
            width: 75,
        })
    })
})
