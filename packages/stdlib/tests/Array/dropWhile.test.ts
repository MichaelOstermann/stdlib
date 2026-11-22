import { describe, expect, it } from "bun:test"
import { dropWhile } from "../../src/Array/dropWhile"

describe("Array.dropWhile", () => {
    it("should drop from the start while the predicate holds", () => {
        expect(dropWhile([1, 2, 3, 1], (x) => x < 3)).toEqual([3, 1])
        expect(dropWhile([1, 2], (x) => x < 3)).toEqual([])
        expect(dropWhile([1, 2, 3], (_, i) => i < 1)).toEqual([2, 3])
    })

    it("should return the same array when the first element does not satisfy the predicate", () => {
        const target = [3, 1]
        expect(dropWhile(target, (x) => x < 3)).toBe(target)
        const empty: number[] = []
        expect(dropWhile(empty, () => true)).toBe(empty)
    })

    it("should not call the predicate after the first miss", () => {
        const seen: number[] = []
        dropWhile([1, 3, 1, 1], (x) => {
            seen.push(x)
            return x < 3
        })
        expect(seen).toEqual([1, 3])
    })
})
