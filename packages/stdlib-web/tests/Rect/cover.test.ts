import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { cover } from "../../src/Rect/cover"

describe("cover", () => {
    it("scales target to cover source area while maintaining aspect ratio", () => {
        const target: Rect = { height: 50, left: 0, top: 0, width: 100 }
        const source: Rect = { height: 100, left: 25, top: 25, width: 100 }
        const result = cover(target, source)

        expect(result).toEqual({
            height: 100,
            left: -25,
            top: 25,
            width: 200,
        })
    })

    it("handles square target and source", () => {
        const target: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const source: Rect = { height: 100, left: 25, top: 25, width: 100 }
        const result = cover(target, source)

        expect(result).toEqual({
            height: 100,
            left: 25,
            top: 25,
            width: 100,
        })
    })

    it("preserves aspect ratio when covering", () => {
        const target: Rect = { height: 100, left: 0, top: 0, width: 200 }
        const source: Rect = { height: 50, left: 0, top: 0, width: 150 }
        const result = cover(target, source)

        expect(result).toEqual({
            height: 75,
            left: 0,
            top: -12.5,
            width: 150,
        })
    })

    it("returns same reference when target already covers source perfectly", () => {
        const target: Rect = { height: 75, left: 25, top: 25, width: 100 }
        const source: Rect = { height: 75, left: 25, top: 25, width: 100 }
        const result = cover(target, source)

        expect(result).toBe(target)
    })
})
