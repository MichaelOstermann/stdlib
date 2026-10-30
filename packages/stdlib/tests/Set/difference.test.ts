import { describe, expect, it } from "bun:test"
import { difference } from "../../src/Set/difference"

describe("Set.difference", () => {
    it("should remove from a copy", () => {
        const target = new Set([1, 2, 3])
        expect([...difference(target, [2, 4])]).toEqual([1, 3])
        expect([...target]).toEqual([1, 2, 3])
    })

    it("should take any iterable", () => {
        expect([...difference(new Set([1, 2]), new Set([2]))]).toEqual([1])
        expect([...difference(new Set(["a", "b"]), new Map([["b", 1]]).keys())]).toEqual(["a"])
    })

    it("should remove everything when given itself", () => {
        const target = new Set([1, 2])
        expect([...difference(target, target)]).toEqual([])
    })

    it("should return the same set when it has none of the values", () => {
        const target = new Set([1, 2])
        expect(difference(target, [3])).toBe(target)
        expect(difference(target, [])).toBe(target)
    })
})
