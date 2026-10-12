import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { placeRightOfBy } from "../../src/Rect/placeRightOfBy"

describe("placeRightOfBy", () => {
    it("places target right of source with specified distance", () => {
        const target: Rect = { height: 75, left: 0, top: 25, width: 50 }
        const source: Rect = { height: 50, left: 50, top: 50, width: 100 }
        const result = placeRightOfBy(target, source, 25)

        expect(result).toEqual({
            height: 75,
            left: 175,
            top: 25,
            width: 50,
        })
    })
})
