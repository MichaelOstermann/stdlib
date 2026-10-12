import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setWidth } from "../../src/Rect/setWidth"

describe("setWidth", () => {
    it("sets width while preserving other properties", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setWidth(rect, 125)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 125,
        })
    })

    it("prevents negative width", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setWidth(rect, -25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 50,
            width: 0,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setWidth(rect, 100)

        expect(result).toBe(rect)
    })
})
