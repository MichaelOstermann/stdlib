import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { expandX } from "../../src/Rect/expandX"

describe("expandX", () => {
    it("expands rectangle horizontally", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = expandX(rect, 25)

        expect(result).toEqual({
            height: 100,
            left: 25,
            top: 50,
            width: 150,
        })
    })

    it("clamps negative amounts to zero", () => {
        const rect: Rect = { height: 100, left: 50, top: 50, width: 100 }
        const result = expandX(rect, -25)

        expect(result).toBe(rect)
    })

    it("returns same reference when amount is zero", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = expandX(rect, 0)

        expect(result).toBe(rect)
    })
})
