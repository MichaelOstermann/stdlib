import { describe, expect, it } from "bun:test"
import { mapLastWhere } from "../../src/Array/mapLastWhere"

describe("Array.mapLastWhere", () => {
    it("should map the last match", () => {
        expect(mapLastWhere([1, 2, 3, 2], (x) => x === 2, (x) => x * 10)).toEqual([1, 2, 3, 20])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(mapLastWhere(target, (x) => x > 3, (x) => x * 10)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 1]
        expect(mapLastWhere(target, (x) => x === 1, (x) => x * 3)).toEqual([1, 2, 3])
        expect(target).toEqual([1, 2, 1])
    })
})
