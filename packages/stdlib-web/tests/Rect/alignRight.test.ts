import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { alignRight } from "../../src/Rect/alignRight"

describe("alignRight", () => {
    it("aligns target right edge with source right edge", () => {
        const target: Rect = { height: 75, left: 0, top: 25, width: 50 }
        const source: Rect = { height: 50, left: 25, top: 100, width: 100 }
        const result = alignRight(target, source)

        expect(result).toEqual({
            height: 75,
            left: 75,
            top: 25,
            width: 50,
        })
    })

    it("returns same reference when nothing changed", () => {
        const target: Rect = { height: 75, left: 0, top: 25, width: 50 }
        const source: Rect = { height: 100, left: 0, top: 50, width: 50 }
        const result = alignRight(target, source)
        expect(result).toBe(target)
    })
})
