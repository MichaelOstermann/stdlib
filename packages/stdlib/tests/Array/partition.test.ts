import { describe, expect, it } from "bun:test"
import { partition } from "../../src/Array/partition"

describe("Array.partition", () => {
    it("should split by the predicate", () => {
        expect(partition([1, 2, 3, 4], (x) => x % 2 === 0)).toEqual([[2, 4], [1, 3]])
        expect(partition([1, 2, 3], (_, i, target) => i === target.length - 1)).toEqual([[3], [1, 2]])
        expect(partition([], () => true)).toEqual([[], []])
    })
})
