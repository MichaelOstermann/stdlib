import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { snapRightOf } from "../../src/Rect/snapRightOf"

describe("snapRightOf", () => {
    it("places target directly right of source", () => {
        const target: Rect = { height: 75, left: 0, top: 25, width: 50 }
        const source: Rect = { height: 50, left: 50, top: 50, width: 100 }
        const result = snapRightOf(target, source)

        expect(result).toEqual({
            height: 75,
            left: 150,
            top: 25,
            width: 50,
        })
    })
})
