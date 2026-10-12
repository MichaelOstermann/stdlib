import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setCenterX } from "../../src/Rect/setCenterX"

describe("setCenterX", () => {
    it("sets horizontal center to specified x coordinate", () => {
        const rect: Rect = { height: 75, left: 0, top: 50, width: 100 }
        const result = setCenterX(rect, 100)

        expect(result).toEqual({
            height: 75,
            left: 50,
            top: 50,
            width: 100,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 75, left: 50, top: 25, width: 100 }
        const result = setCenterX(rect, 100)

        expect(result).toBe(rect)
    })
})
