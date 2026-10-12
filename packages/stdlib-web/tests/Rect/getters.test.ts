import { describe, expect, it } from "bun:test"
import { Rect } from "../../src/Rect/index"

// The properties of a DOMRect are getters of its prototype.
class Getters {
    get height(): number {
        return 10
    }

    get left(): number {
        return 1
    }

    get top(): number {
        return 2
    }

    get width(): number {
        return 20
    }
}

describe("Rect", () => {
    it("should support rectangles whose properties are getters", () => {
        expect(Rect.translateX(new Getters(), 5)).toEqual({ height: 10, left: 6, top: 2, width: 20 })
        expect(Rect.setWidth(new Getters(), 5)).toEqual({ height: 10, left: 1, top: 2, width: 5 })
        expect(Rect.snapBelow(new Getters(), new Getters())).toEqual({ height: 10, left: 1, top: 12, width: 20 })
    })
})
