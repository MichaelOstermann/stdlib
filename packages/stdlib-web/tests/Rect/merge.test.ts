import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { merge } from "../../src/Rect/merge"

describe("merge", () => {
    it("merges partial properties", () => {
        const target: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const source = { height: 125, width: 150 }
        const result = merge(target, source)

        expect(result).toEqual({
            height: 125,
            left: 25,
            top: 50,
            width: 150,
        })
    })

    it("returns target unchanged when source is empty", () => {
        const target: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = merge(target, {})

        expect(result).toBe(target)
    })

    it("returns same reference when nothing changed", () => {
        const target: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = merge(target, { ...target })

        expect(result).toBe(target)
    })

    it("rejects non-finite numbers", () => {
        const target: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const source = { height: Infinity, width: Number.NaN }
        const result = merge(target, source)

        expect(result).toBe(target)
    })

    it("normalizes the result", () => {
        const target: Rect = { height: 50, left: 100, top: 100, width: 50 }
        const source = { height: -25, width: -25 }
        const result = merge(target, source)

        expect(result).toEqual({
            height: 25,
            left: 75,
            top: 75,
            width: 25,
        })
    })
})
