import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { snapAbove } from "../../src/Rect/snapAbove"

describe("snapAbove", () => {
    it("places target directly above source", () => {
        const target: Rect = { height: 25, left: 25, top: 100, width: 50 }
        const source: Rect = { height: 50, left: 50, top: 75, width: 100 }
        const result = snapAbove(target, source)

        expect(result).toEqual({
            height: 25,
            left: 25,
            top: 50,
            width: 50,
        })
    })
})
