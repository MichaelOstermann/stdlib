import { describe, expect, it } from "bun:test"
import { setAt } from "../../src/Array/setAt"

describe("Array.setAt", () => {
    it("should set the element at the index", () => {
        expect(setAt([1, 2, 3], 0, 0)).toEqual([0, 2, 3])
        expect(setAt([1, 2, 3], 2, 0)).toEqual([1, 2, 0])
    })

    it("should count a negative index from the end", () => {
        expect(setAt([1, 2, 3], -1, 0)).toEqual([1, 2, 0])
        expect(setAt([1, 2, 3], -3, 0)).toEqual([0, 2, 3])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(setAt(target, 1, 2)).toBe(target)
        expect(setAt(target, 3, 0)).toBe(target)
        expect(setAt(target, -4, 0)).toBe(target)
        expect(setAt([], 0, 0)).toEqual([])
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        setAt(target, 1, 0)
        expect(target).toEqual([1, 2, 3])
    })
})
