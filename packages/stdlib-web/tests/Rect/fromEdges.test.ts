import { describe, expect, it } from "bun:test"
import { fromEdges } from "../../src/Rect/fromEdges"

describe("fromEdges", () => {
    it("creates rect from edge coordinates", () => {
        const edges = { bottom: 150, left: 25, right: 125, top: 50 }
        const result = fromEdges(edges)

        expect(result).toEqual({
            height: 100,
            left: 25,
            top: 50,
            width: 100,
        })
    })

    it("handles swapped min/max values", () => {
        const edges = { bottom: 50, left: 100, right: 25, top: 150 }
        const result = fromEdges(edges)

        expect(result).toEqual({
            height: 100,
            left: 25,
            top: 50,
            width: 75,
        })
    })
})
