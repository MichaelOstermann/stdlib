import { describe, expect, it } from "bun:test"
import { mapFirstWhere } from "../../src/Array/mapFirstWhere"

describe("Array.mapFirstWhere", () => {
    it("should map the first match", () => {
        expect(mapFirstWhere([1, 2, 3, 2], (x) => x === 2, (x) => x * 10)).toEqual([1, 20, 3, 2])
        expect(mapFirstWhere([1, 2], (_, i) => i === 1, (x, i, target) => x + i + target.length)).toEqual([1, 5])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(mapFirstWhere(target, (x) => x === 4, (x) => x * 10)).toBe(target)
        expect(mapFirstWhere(target, (x) => x === 2, (x) => x)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        mapFirstWhere(target, (x) => x === 2, (x) => x * 10)
        expect(target).toEqual([1, 2, 3])
    })

    it("should not take NaN for a change", () => {
        const target = [Number.NaN]
        expect(mapFirstWhere(target, Number.isNaN, (x) => x)).toBe(target)
    })
})
