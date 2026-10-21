import { describe, expect, it } from "bun:test"
import { unique } from "../../src/Array/unique"

describe("Array.unique", () => {
    it("should remove duplicates, keeping the first occurrence", () => {
        expect(unique([1, 2, 1, 3, 2])).toEqual([1, 2, 3])
    })

    it("should return the same array when there are no duplicates", () => {
        const target = [1, 2, 3]
        expect(unique(target)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 1]
        expect(unique(target)).not.toBe(target)
        expect(target).toEqual([1, 1])
    })
})
