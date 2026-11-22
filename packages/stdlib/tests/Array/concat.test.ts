import { describe, expect, it } from "bun:test"
import { concat } from "../../src/Array/concat"

describe("Array.concat", () => {
    it("should put the values after the elements", () => {
        expect(concat([1, 2], [3, 4])).toEqual([1, 2, 3, 4])
    })

    it("should return the other array when one of them is empty", () => {
        const a = [1, 2]
        const b = [3]
        expect(concat(a, [])).toBe(a)
        expect(concat([], b)).toBe(b)
    })

    it("should not flatten nested arrays", () => {
        expect(concat([[1]], [[2]])).toEqual([[1], [2]])
    })

    it("should not change what it was given", () => {
        const a = [1]
        const b = [2]
        concat(a, b)
        expect(a).toEqual([1])
        expect(b).toEqual([2])
    })
})
