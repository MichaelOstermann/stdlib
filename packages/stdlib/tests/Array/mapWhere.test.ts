import { describe, expect, it } from "bun:test"
import { mapWhere } from "../../src/Array/mapWhere"

describe("Array.mapWhere", () => {
    it("should map every match", () => {
        expect(mapWhere([1, 2, 3, 2], (x) => x === 2, (x) => x * 10)).toEqual([1, 20, 3, 20])
        expect(mapWhere([1, 2, 3], (_, i) => i > 0, (x, i, target) => x + i + target.length)).toEqual([1, 6, 8])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(mapWhere(target, (x) => x === 4, (x) => x * 10)).toBe(target)
        expect(mapWhere(target, () => true, (x) => x)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        mapWhere(target, (x) => x > 1, (x) => x * 10)
        expect(target).toEqual([1, 2, 3])
    })
})
