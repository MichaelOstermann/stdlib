import { describe, expect, it } from "bun:test"
import { replaceFirst } from "../../src/Array/replaceFirst"

describe("Array.replaceFirst", () => {
    it("should replace the first occurrence", () => {
        expect(replaceFirst([1, 2, 1], 1, 3)).toEqual([3, 2, 1])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(replaceFirst(target, 4, 5)).toBe(target)
        expect(replaceFirst(target, 2, 2)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        replaceFirst(target, 2, 4)
        expect(target).toEqual([1, 2, 3])
    })
})
