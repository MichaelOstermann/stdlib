import { describe, expect, it } from "bun:test"
import { union } from "../../src/Set/union"

describe("Set.union", () => {
    it("should add to a copy", () => {
        const target = new Set([1, 2])
        expect([...union(target, [2, 3, 4])]).toEqual([1, 2, 3, 4])
        expect([...target]).toEqual([1, 2])
    })

    it("should take any iterable", () => {
        expect([...union(new Set([1]), new Set([2]))]).toEqual([1, 2])
        expect([...union(new Set(["a"]), new Map([["b", 1]]).keys())]).toEqual(["a", "b"])
    })

    it("should return the same set when it has every value already", () => {
        const target = new Set([1, 2])
        expect(union(target, [2, 1])).toBe(target)
        expect(union(target, [])).toBe(target)
        expect(union(target, target)).toBe(target)
    })
})
