import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setHeight } from "../../src/Rect/setHeight"

describe("setHeight", () => {
    it("sets height while preserving other properties", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setHeight(rect, 125)

        expect(result).toEqual({
            height: 125,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("prevents negative height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setHeight(rect, -25)

        expect(result).toEqual({
            height: 0,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setHeight(rect, 75)

        expect(result).toBe(rect)
    })
})
