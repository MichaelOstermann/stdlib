import type { Rect } from "../../src/Rect/types"
import { describe, expect, it, vi } from "bun:test"
import { transform } from "../../src/Rect/transform"

describe("transform", () => {
    it("transforms each property individually", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = transform(rect, v => v * 2)

        expect(result).toEqual({
            height: 150,
            left: 50,
            top: 100,
            width: 200,
        })
    })

    it("passes key and rect to transform function", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const transformFn = vi.fn((v: number) => v)
        transform(rect, transformFn)
        expect(transformFn).toHaveBeenCalledTimes(4)
        expect(transformFn).toHaveBeenCalledWith(75, "height", rect)
        expect(transformFn).toHaveBeenCalledWith(25, "left", rect)
        expect(transformFn).toHaveBeenCalledWith(50, "top", rect)
        expect(transformFn).toHaveBeenCalledWith(100, "width", rect)
    })

    it("returns same reference when no changes made", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = transform(rect, v => v)
        expect(result).toBe(rect)
    })
})
