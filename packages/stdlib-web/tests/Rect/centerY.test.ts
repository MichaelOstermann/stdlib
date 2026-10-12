import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { centerY } from "../../src/Rect/centerY"

describe("centerY", () => {
    it("calculates vertical center correctly", () => {
        const rect: Rect = { height: 100, left: 25, top: 50, width: 100 }
        expect(centerY(rect)).toBe(100)
    })
})
