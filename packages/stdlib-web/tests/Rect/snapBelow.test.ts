import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { snapBelow } from "../../src/Rect/snapBelow"

describe("snapBelow", () => {
    it("places target directly below source", () => {
        const target: Rect = { height: 25, left: 25, top: 0, width: 50 }
        const source: Rect = { height: 50, left: 50, top: 75, width: 100 }
        const result = snapBelow(target, source)

        expect(result).toEqual({
            height: 25,
            left: 25,
            top: 125,
            width: 50,
        })
    })
})
