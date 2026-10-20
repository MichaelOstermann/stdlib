import { describe, expect, it } from "bun:test"
import { removeFirstWhere } from "../../src/Array/removeFirstWhere"

describe("Array.removeFirstWhere", () => {
    it("should remove the first match", () => {
        expect(removeFirstWhere([1, 2, 3, 4], (x) => x > 1)).toEqual([1, 3, 4])
        expect(removeFirstWhere([1, 2, 3], (_, i, target) => i === target.length - 1)).toEqual([1, 2])
    })

    it("should return the same array when nothing matches", () => {
        const target = [1, 2, 3]
        expect(removeFirstWhere(target, (x) => x > 3)).toBe(target)
        expect(removeFirstWhere(target, (x) => x > 3)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        removeFirstWhere(target, (x) => x > 1)
        expect(target).toEqual([1, 2, 3])
    })

    it("should change what it was given when asked to", () => {
        const target = [1, 2, 3]
        expect(removeFirstWhere(target, (x) => x > 1, { mut: true })).toBe(target)
        expect(target).toEqual([1, 3])
    })
})
