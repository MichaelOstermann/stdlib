import { describe, expect, it } from "bun:test"
import { removeAll } from "../../src/Array/removeAll"

describe("Array.removeAll", () => {
    it("should remove every occurrence of each value", () => {
        expect(removeAll([1, 2, 3, 2, 4], [2, 4])).toEqual([1, 3])
        expect(removeAll([1, 2, 3], new Set([1, 2, 3]))).toEqual([])
    })

    it("should return the same array when no value occurs", () => {
        const target = [1, 2, 3]
        expect(removeAll(target, [])).toBe(target)
        expect(removeAll(target, [4, 5])).toBe(target)
        expect(removeAll([Number.NaN], [Number.NaN])).toEqual([Number.NaN])
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        removeAll(target, [2])
        expect(target).toEqual([1, 2, 3])
    })

    it("should work the same for a few and for many values", () => {
        const target = [1, 2, 3, 4, 5, 6, 7, Number.NaN]
        expect(removeAll(target, [1, 2])).toEqual([3, 4, 5, 6, 7, Number.NaN])
        expect(removeAll(target, [1, 2, 3, 4, 5, Number.NaN])).toEqual([6, 7, Number.NaN])
        expect(removeAll(target, new Set([1, Number.NaN]))).toEqual([2, 3, 4, 5, 6, 7, Number.NaN])
        expect(removeAll(target, [Number.NaN, 8])).toBe(target)
        expect(removeAll(target, [8, 9, 10, 11, 12, Number.NaN])).toBe(target)
    })
})
