import { describe, expect, it } from "bun:test"
import { top } from "../../src/Rect/top"

describe("top", () => {
    it("returns top correctly", () => {
        expect(top({ height: 75, left: 25, top: 50, width: 100 })).toBe(50)
    })
})
