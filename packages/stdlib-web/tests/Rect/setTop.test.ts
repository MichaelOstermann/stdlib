import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { setTop } from "../../src/Rect/setTop"

describe("setTop", () => {
    it("sets top edge and adjusts height", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setTop(rect, 25)

        expect(result).toEqual({
            height: 100,
            left: 25,
            top: 25,
            width: 100,
        })
    })

    it("handles setting top below bottom", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setTop(rect, 150)

        expect(result).toEqual({
            height: 0,
            left: 25,
            top: 125,
            width: 100,
        })
    })

    it("returns same reference when no change needed", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        const result = setTop(rect, 50)

        expect(result).toBe(rect)
    })
})
