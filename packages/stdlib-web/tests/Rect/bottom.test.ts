import { describe, expect, it } from "bun:test"
import { bottom } from "../../src/Rect/bottom"

describe("bottom", () => {
    it("calculates bottom edge correctly", () => {
        expect(bottom({ height: 75, left: 25, top: 50, width: 100 })).toBe(125)
    })
})
