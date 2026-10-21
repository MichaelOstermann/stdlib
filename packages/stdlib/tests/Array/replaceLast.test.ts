import { describe, expect, it } from "bun:test"
import { replaceLast } from "../../src/Array/replaceLast"

describe("Array.replaceLast", () => {
    it("should replace the last occurrence", () => {
        expect(replaceLast([1, 2, 1], 1, 3)).toEqual([1, 2, 3])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(replaceLast(target, 4, 0)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 1]
        expect(replaceLast(target, 1, 3)).toEqual([1, 2, 3])
        expect(target).toEqual([1, 2, 1])
    })
})
