import { describe, expect, it } from "bun:test"
import { right } from "../../src/Rect/right"

describe("right", () => {
    it("calculates right edge correctly", () => {
        expect(right({ height: 75, left: 25, top: 50, width: 100 })).toBe(125)
    })
})
