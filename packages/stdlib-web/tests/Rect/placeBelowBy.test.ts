import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { placeBelowBy } from "../../src/Rect/placeBelowBy"

describe("placeBelowBy", () => {
    it("places target below source with specified distance", () => {
        const target: Rect = { height: 25, left: 25, top: 0, width: 50 }
        const source: Rect = { height: 50, left: 50, top: 75, width: 100 }
        const result = placeBelowBy(target, source, 25)

        expect(result).toEqual({
            height: 25,
            left: 25,
            top: 150,
            width: 50,
        })
    })
})
