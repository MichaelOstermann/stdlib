import { describe, expect, it } from "bun:test"
import { replaceLastWhere } from "../../src/Array/replaceLastWhere"

describe("Array.replaceLastWhere", () => {
    it("should replace the last match", () => {
        expect(replaceLastWhere([1, 2, 3], (x) => x > 1, 0)).toEqual([1, 2, 0])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(replaceLastWhere(target, (x) => x > 3, 0)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 1]
        expect(replaceLastWhere(target, (x) => x === 1, 3)).toEqual([1, 2, 3])
        expect(target).toEqual([1, 2, 1])
    })
})
