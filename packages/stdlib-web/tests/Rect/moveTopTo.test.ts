import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { moveTopTo } from "../../src/Rect/moveTopTo"

describe("moveTopTo", () => {
    it("moves rectangle to specified top position", () => {
        const rect: Rect = { height: 100, left: 50, top: 100, width: 75 }
        const result = moveTopTo(rect, 25)

        expect(result).toEqual({
            height: 100,
            left: 50,
            top: 25,
            width: 75,
        })
    })

    it("returns same reference when nothing changed", () => {
        const rect: Rect = { height: 100, left: 50, top: 100, width: 75 }
        const result = moveTopTo(rect, 100)
        expect(result).toBe(rect)
    })
})
