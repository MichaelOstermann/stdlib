import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { alignTop } from "../../src/Rect/alignTop"

describe("alignTop", () => {
    it("aligns target top edge with source top edge", () => {
        const target: Rect = { height: 75, left: 25, top: 100, width: 50 }
        const source: Rect = { height: 50, left: 100, top: 25, width: 100 }
        const result = alignTop(target, source)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 25,
            width: 50,
        })
    })

    it("returns same reference when nothing changed", () => {
        const target: Rect = { height: 75, left: 25, top: 100, width: 50 }
        const source: Rect = { height: 50, left: 75, top: 100, width: 25 }
        const result = alignTop(target, source)
        expect(result).toBe(target)
    })
})
