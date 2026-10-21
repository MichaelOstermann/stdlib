import { describe, expect, it } from "bun:test"
import { filter } from "../../src/Array/filter"

describe("Array.filter", () => {
    it("should keep what satisfies the predicate", () => {
        expect(filter([1, 2, 3, 4], (x) => x % 2 === 0)).toEqual([2, 4])
        expect(filter([1, 2, 3], (_, i, target) => i < target.length - 1)).toEqual([1, 2])
        expect(filter([1, 2, 3], () => false)).toEqual([])
    })

    it("should return the same array when nothing was removed", () => {
        const target = [1, 2, 3]
        expect(filter(target, () => true)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        expect(filter(target, (x) => x > 1)).not.toBe(target)
        expect(target).toEqual([1, 2, 3])
    })
})
