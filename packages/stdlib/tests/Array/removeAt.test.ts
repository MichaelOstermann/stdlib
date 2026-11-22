import { describe, expect, it } from "bun:test"
import { removeAt } from "../../src/Array/removeAt"

describe("Array.removeAt", () => {
    it("should remove the element at the index", () => {
        expect(removeAt([1, 2, 3], 0)).toEqual([2, 3])
        expect(removeAt([1, 2, 3], 1)).toEqual([1, 3])
    })

    it("should count a negative index from the end", () => {
        expect(removeAt([1, 2, 3], -1)).toEqual([1, 2])
        expect(removeAt([1, 2, 3], -3)).toEqual([2, 3])
    })

    it("should return the same array when the index is out of range", () => {
        const target = [1, 2, 3]
        expect(removeAt(target, 3)).toBe(target)
        expect(removeAt(target, -4)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        removeAt(target, 1)
        expect(target).toEqual([1, 2, 3])
    })
})
