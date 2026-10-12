import type { Rect } from "../../src/Rect/types"
import { describe, expect, it } from "bun:test"
import { area } from "../../src/Rect/area"

describe("area", () => {
    it("calculates area correctly", () => {
        const rect: Rect = { height: 25, left: 0, top: 0, width: 50 }
        expect(area(rect)).toBe(1250)
    })
})
