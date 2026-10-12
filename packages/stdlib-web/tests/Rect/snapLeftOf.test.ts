import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { snapLeftOf } from "../../src/Rect/snapLeftOf"

describe("snapLeftOf", () => {
    it("places target directly left of source", () => {
        const target: Rect = { height: 75, left: 100, top: 25, width: 50 }
        const source: Rect = { height: 50, left: 100, top: 50, width: 100 }
        const result = snapLeftOf(target, source)

        expect(result).toEqual({
            height: 75,
            left: 50,
            top: 25,
            width: 50,
        })
    })
})
