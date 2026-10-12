import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { alignCenterX } from "../../src/Rect/alignCenterX"

describe("alignCenterX", () => {
    it("aligns target horizontally with source center", () => {
        const target: Rect = { height: 75, left: 0, top: 25, width: 50 }
        const source: Rect = { height: 50, left: 50, top: 100, width: 100 }
        const result = alignCenterX(target, source)

        expect(result).toEqual({
            height: 75,
            left: 75,
            top: 25,
            width: 50,
        })
    })

    it("returns same reference when nothing changed", () => {
        const target: Rect = { height: 50, left: 50, top: 50, width: 50 }
        const source: Rect = { height: 50, left: 0, top: 25, width: 150 }
        const result = alignCenterX(target, source)
        expect(result).toBe(target)
    })
})
