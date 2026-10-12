import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { contain } from "../../src/Rect/contain"

describe("contain", () => {
    it("scales target to fit inside source while maintaining aspect ratio", () => {
        const target: Rect = { height: 100, left: 0, top: 0, width: 200 }
        const source: Rect = { height: 100, left: 25, top: 25, width: 100 }
        const result = contain(target, source)

        expect(result).toEqual({
            height: 50,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("handles target already fitting inside source", () => {
        const target: Rect = { height: 50, left: 0, top: 0, width: 50 }
        const source: Rect = { height: 100, left: 25, top: 25, width: 100 }
        const result = contain(target, source)

        expect(result).toEqual({
            height: 100,
            left: 25,
            top: 25,
            width: 100,
        })
    })

    it("preserves aspect ratio", () => {
        const target: Rect = { height: 200, left: 0, top: 0, width: 100 }
        const source: Rect = { height: 150, left: 0, top: 0, width: 50 }
        const result = contain(target, source)

        expect(result).toEqual({
            height: 100,
            left: 0,
            top: 25,
            width: 50,
        })
    })

    it("returns same reference when target already fits perfectly", () => {
        const target: Rect = { height: 75, left: 25, top: 25, width: 100 }
        const source: Rect = { height: 75, left: 25, top: 25, width: 100 }
        const result = contain(target, source)

        expect(result).toBe(target)
    })
})
