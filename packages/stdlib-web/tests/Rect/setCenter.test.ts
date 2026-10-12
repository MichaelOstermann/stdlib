import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setCenter } from "../../src/Rect/setCenter"

describe("setCenter", () => {
    it("sets rectangle center to specified coordinates", () => {
        const rect: Rect = { height: 50, left: 0, top: 0, width: 100 }
        const result = setCenter(rect, 100, 75)

        expect(result).toEqual({
            height: 50,
            left: 50,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 100, left: 0, top: 0, width: 100 }
        const result = setCenter(rect, 50, 50)
        expect(result).toBe(rect)
    })
})
