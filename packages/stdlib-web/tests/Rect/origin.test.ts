import { describe, expect, it } from "bun:test"
import { origin } from "../../src/Rect/origin"

describe("origin", () => {
    it("exports origin rectangle constant", () => {
        expect(origin).toEqual({
            height: 0,
            left: 0,
            top: 0,
            width: 0,
        })
    })
})
