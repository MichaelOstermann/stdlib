import { describe, expect, it } from "bun:test"
import { removeFirst } from "../../src/Array/removeFirst"

describe("Array.removeFirst", () => {
    it("should remove the first occurrence", () => {
        expect(removeFirst([1, 2, 1], 1)).toEqual([2, 1])
    })

    it("should return the same array when the value does not occur", () => {
        const target = [1, 2, 3]
        expect(removeFirst(target, 4)).toBe(target)
        expect(removeFirst([Number.NaN], Number.NaN)).toEqual([Number.NaN])
    })

    it("should remove functions instead of calling them", () => {
        const a = (): boolean => true
        const b = (): boolean => true
        expect(removeFirst([a, b], a)).toEqual([b])
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        removeFirst(target, 2)
        expect(target).toEqual([1, 2, 3])
    })
})
