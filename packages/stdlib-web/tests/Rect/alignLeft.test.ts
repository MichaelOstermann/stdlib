import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { alignLeft } from "../../src/Rect/alignLeft"

describe("alignLeft", () => {
    it("aligns target left edge with source left edge", () => {
        const target: Rect = { height: 75, left: 100, top: 25, width: 50 }
        const source: Rect = { height: 50, left: 25, top: 100, width: 100 }
        const result = alignLeft(target, source)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 25,
            width: 50,
        })
    })

    it("returns same reference when nothing changed", () => {
        const target: Rect = { height: 75, left: 100, top: 25, width: 50 }
        const source: Rect = { height: 50, left: 100, top: 100, width: 100 }
        const result = alignLeft(target, source)
        expect(result).toBe(target)
    })
})
