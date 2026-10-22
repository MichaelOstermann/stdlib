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

    it("should compare with Object.is: NaN is not a change, -0 is", () => {
        const target = [Number.NaN, 1, 0]
        expect(map(target, (x) => x)).toBe(target)
        expect(map(target, (x) => x === 0 ? -0 : x)).not.toBe(target)
    })

    it("should pass the index and the array", () => {
        const target = ["a", "b"]
        expect(map(target, (value, index, array) => [value, index, array === target])).toEqual([["a", 0, true], ["b", 1, true]])
    })
})
