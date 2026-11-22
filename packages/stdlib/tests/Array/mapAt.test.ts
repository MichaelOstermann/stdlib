import { describe, expect, it } from "bun:test"
import { mapAt } from "../../src/Array/mapAt"

describe("Array.mapAt", () => {
    it("should map the element at the index", () => {
        expect(mapAt([1, 2, 3], 1, (x) => x * 10)).toEqual([1, 20, 3])
        expect(mapAt([1, 2], 1, (x, i, target) => x + i + target.length)).toEqual([1, 5])
    })

    it("should count a negative index from the end, and pass the position", () => {
        expect(mapAt([1, 2, 3], -1, (x) => x * 10)).toEqual([1, 2, 30])
        expect(mapAt([1, 2, 3], -1, (_, i) => i)).toEqual([1, 2, 2])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(mapAt(target, 1, (x) => x)).toBe(target)
        expect(mapAt(target, 3, (x) => x * 10)).toBe(target)
        expect(mapAt(target, -4, (x) => x * 10)).toBe(target)
    })

    it("should not call map when the index is out of range", () => {
        let calls = 0
        mapAt([1], 1, (x) => {
            calls++
            return x
        })
        expect(calls).toBe(0)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        mapAt(target, 1, (x) => x * 10)
        expect(target).toEqual([1, 2, 3])
    })
})
