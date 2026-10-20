import { describe, expect, it } from "bun:test"
import { removeLastWhere } from "../../src/Array/removeLastWhere"

describe("Array.removeLastWhere", () => {
    it("should remove the last match", () => {
        expect(removeLastWhere([1, 2, 3, 4], (x) => x > 1)).toEqual([1, 2, 3])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(removeLastWhere(target, (x) => x > 3)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 1]
        expect(removeLastWhere(target, (x) => x === 1)).toEqual([1, 2])
        expect(target).toEqual([1, 2, 1])
    })

    it("should change what it was given when asked to", () => {
        const target = [1, 2, 1]
        expect(removeLastWhere(target, (x) => x === 1, { mut: true })).toBe(target)
        expect(target).toEqual([1, 2])
    })
})
