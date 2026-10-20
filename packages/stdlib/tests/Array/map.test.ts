import { describe, expect, it } from "bun:test"
import { map } from "../../src/Array/map"

describe("Array.map", () => {
    it("should map every element", () => {
        expect(map([1, 2, 3], (x) => x * 2)).toEqual([2, 4, 6])
        expect(map(["a", "b"], (x, i, target) => `${x}${i}${target.length}`)).toEqual(["a02", "b12"])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(map(target, (x) => x)).toBe(target)
        expect(map([] as number[], (x) => x * 2)).toEqual([])
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        expect(map(target, (x) => x + 1)).not.toBe(target)
        expect(target).toEqual([1, 2, 3])
    })

    it("should change what it was given when asked to", () => {
        const target = [1, 2, 3]
        expect(map(target, (x) => x + 1, { mut: true })).toBe(target)
        expect(target).toEqual([2, 3, 4])
    })

    it("should not take NaN for a change", () => {
        const target = [Number.NaN, 1, 0]
        expect(map(target, (x) => x)).toBe(target)
        expect(map(target, (x) => x === 0 ? -0 : x)).toBe(target)
    })

    it("should pass the index and the array", () => {
        const target = ["a", "b"]
        expect(map(target, (value, index, array) => [value, index, array === target])).toEqual([["a", 0, true], ["b", 1, true]])
    })
})
