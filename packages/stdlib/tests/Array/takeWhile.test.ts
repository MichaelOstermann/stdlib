import { describe, expect, it } from "bun:test"
import { takeWhile } from "../../src/Array/takeWhile"

describe("Array.takeWhile", () => {
    it("should take from the start while the predicate holds", () => {
        expect(takeWhile([1, 2, 3, 1], (x) => x < 3)).toEqual([1, 2])
        expect(takeWhile([3, 1], (x) => x < 3)).toEqual([])
        expect(takeWhile([1, 2, 3], (_, i) => i < 1)).toEqual([1])
    })

    it("should return the same array when all elements satisfy the predicate", () => {
        const target = [1, 2]
        expect(takeWhile(target, (x) => x < 3)).toBe(target)
        const empty: number[] = []
        expect(takeWhile(empty, () => false)).toBe(empty)
    })

    it("should not call the predicate after the first miss", () => {
        const seen: number[] = []
        takeWhile([1, 3, 1, 1], (x) => {
            seen.push(x)
            return x < 3
        })
        expect(seen).toEqual([1, 3])
    })
})
