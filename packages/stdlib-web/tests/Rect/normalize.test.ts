import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { normalize } from "../../src/Rect/normalize"

describe("normalize", () => {
    it("returns unchanged rect with positive dimensions", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = normalize(rect)
        expect(result).toBe(rect)
    })

    it("adjusts position for negative width", () => {
        const rect: Rect = { height: 75, left: 100, top: 50, width: -50 }
        const result = normalize(rect)

        expect(result).toEqual({
            height: 75,
            left: 50,
            top: 50,
            width: 50,
        })
    })

    it("adjusts position for negative height", () => {
        const rect: Rect = { height: -25, left: 25, top: 100, width: 75 }
        const result = normalize(rect)

        expect(result).toEqual({
            height: 25,
            left: 25,
            top: 75,
            width: 75,
        })
    })

    it("handles both negative dimensions", () => {
        const rect: Rect = { height: -25, left: 100, top: 100, width: -50 }
        const result = normalize(rect)

        expect(result).toEqual({
            height: 25,
            left: 50,
            top: 75,
            width: 50,
        })
    })
})
