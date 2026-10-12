import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { placeAboveBy } from "../../src/Rect/placeAboveBy"

describe("placeAboveBy", () => {
    it("places target above source with specified distance", () => {
        const target: Rect = { height: 25, left: 25, top: 100, width: 50 }
        const source: Rect = { height: 50, left: 50, top: 75, width: 100 }
        const result = placeAboveBy(target, source, 25)

        expect(result).toEqual({
            height: 25,
            left: 25,
            top: 25,
            width: 50,
        })
    })
})
