import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { alignBottom } from "../../src/Rect/alignBottom"

describe("alignBottom", () => {
    it("aligns target bottom edge with source bottom edge", () => {
        const target: Rect = { height: 25, left: 0, top: 0, width: 50 }
        const source: Rect = { height: 75, left: 75, top: 50, width: 25 }
        const result = alignBottom(target, source)

        expect(result).toEqual({
            height: 25,
            left: 0,
            top: 100,
            width: 50,
        })
    })

    it("returns same reference when nothing changed", () => {
        const target: Rect = { height: 25, left: 0, top: 0, width: 50 }
        const source: Rect = { height: 0, left: 75, top: 25, width: 25 }
        const result = alignBottom(target, source)
        expect(result).toBe(target)
    })
})
