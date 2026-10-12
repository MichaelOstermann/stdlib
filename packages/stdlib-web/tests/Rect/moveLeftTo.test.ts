import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { moveLeftTo } from "../../src/Rect/moveLeftTo"

describe("moveLeftTo", () => {
    it("moves rectangle to specified left position", () => {
        const rect: Rect = { height: 100, left: 100, top: 50, width: 75 }
        const result = moveLeftTo(rect, 25)

        expect(result).toEqual({
            height: 100,
            left: 25,
            top: 50,
            width: 75,
        })
    })

    it("returns same reference when nothing changed", () => {
        const rect: Rect = { height: 100, left: 100, top: 50, width: 75 }
        const result = moveLeftTo(rect, 100)
        expect(result).toBe(rect)
    })
})
