import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { centerX } from "../../src/Rect/centerX"

describe("centerX", () => {
    it("calculates horizontal center correctly", () => {
        const rect: Rect = { height: 75, left: 25, top: 50, width: 100 }
        expect(centerX(rect)).toBe(75)
    })
})
