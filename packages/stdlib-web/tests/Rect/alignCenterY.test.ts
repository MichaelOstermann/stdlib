import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { alignCenterY } from "../../src/Rect/alignCenterY"

describe("alignCenterY", () => {
    it("aligns target vertically with source center", () => {
        const target: Rect = { height: 50, left: 25, top: 0, width: 75 }
        const source: Rect = { height: 100, left: 100, top: 50, width: 50 }
        const result = alignCenterY(target, source)

        expect(result).toEqual({
            height: 50,
            left: 25,
            top: 75,
            width: 75,
        })
    })

    it("returns same reference when nothing changed", () => {
        const target: Rect = { height: 50, left: 50, top: 50, width: 50 }
        const source: Rect = { height: 150, left: 25, top: 0, width: 50 }
        const result = alignCenterY(target, source)
        expect(result).toBe(target)
    })
})
