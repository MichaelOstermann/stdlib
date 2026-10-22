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
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        removeAll(target, [2])
        expect(target).toEqual([1, 2, 3])
    })

    it("should remove NaN, as Object.is finds it", () => {
        expect(removeAll([1, Number.NaN, 2], [Number.NaN])).toEqual([1, 2])
    })
})
