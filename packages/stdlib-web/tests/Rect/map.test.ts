import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { map } from "../../src/Rect/map"

describe("map", () => {
    it("applies transformation function and merges result", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = map(rect, r => ({ width: r.width * 2 }))

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 200,
        })
    })

    it("returns same reference when transform results with no changes", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }

        const result1 = map(rect, () => ({}))
        expect(result1).toBe(rect)

        const result2 = map(rect, r => r)
        expect(result2).toBe(rect)

        const result3 = map(rect, r => ({ width: r.width }))
        expect(result3).toBe(rect)

        const result4 = map(rect, r => ({ height: r.height }))
        expect(result4).toBe(rect)

        const result5 = map(rect, r => ({ top: r.top }))
        expect(result5).toBe(rect)

        const result6 = map(rect, r => ({ left: r.left }))
        expect(result6).toBe(rect)
    })
})
