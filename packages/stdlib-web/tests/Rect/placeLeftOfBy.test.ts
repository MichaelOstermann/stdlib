import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { placeLeftOfBy } from "../../src/Rect/placeLeftOfBy"

describe("placeLeftOfBy", () => {
    it("places target left of source with specified distance", () => {
        const target: Rect = { height: 75, left: 100, top: 25, width: 50 }
        const source: Rect = { height: 50, left: 100, top: 50, width: 100 }
        const result = placeLeftOfBy(target, source, 25)

        expect(result).toEqual({
            height: 75,
            left: 25,
            top: 25,
            width: 50,
        })
    })
})
