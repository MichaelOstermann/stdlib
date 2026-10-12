import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { alignCenter } from "../../src/Rect/alignCenter"

describe("alignCenter", () => {
    it("centers target at source center", () => {
        const target: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const source: Rect = { height: 100, left: 25, top: 25, width: 100 }
        const result = alignCenter(target, source)

        expect(result).toEqual({
            height: 50,
            left: 50,
            top: 50,
            width: 50,
        })
    })

    it("returns same reference when nothing changed", () => {
        const target: Rect = { height: 50, left: 50, top: 50, width: 50 }
        const source: Rect = { height: 150, left: 0, top: 0, width: 150 }
        const result = alignCenter(target, source)
        expect(result).toBe(target)
    })
})
