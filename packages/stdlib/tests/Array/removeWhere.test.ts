import { describe, expect, it } from "bun:test"
import { removeWhere } from "../../src/Array/removeWhere"

describe("Array.removeWhere", () => {
    it("should remove every match", () => {
        expect(removeWhere([1, 2, 3, 4], (x) => x % 2 === 0)).toEqual([1, 3])
        expect(removeWhere([1, 2, 3], (_, i, target) => i < target.length - 1)).toEqual([3])
        expect(removeWhere([1, 2, 3], () => true)).toEqual([])
    })

    it("should return the same array when nothing matches", () => {
        const target = [1, 2, 3]
        expect(removeWhere(target, (x) => x > 3)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        removeWhere(target, (x) => x > 1)
        expect(target).toEqual([1, 2, 3])
    })
})
