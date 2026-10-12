import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setCenterY } from "../../src/Rect/setCenterY"

describe("setCenterY", () => {
    it("sets vertical center to specified y coordinate", () => {
        const rect: Rect = { height: 100, left: 50, top: 0, width: 75 }
        const result = setCenterY(rect, 100)

        expect(result).toEqual({
            height: 100,
            left: 50,
            top: 50,
            width: 75,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 100 }
        const result = setCenterY(rect, 100)

        expect(result).toBe(rect)
    })
})
