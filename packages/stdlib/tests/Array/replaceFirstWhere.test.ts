import { describe, expect, it } from "bun:test"
import { replaceFirstWhere } from "../../src/Array/replaceFirstWhere"

describe("Array.replaceFirstWhere", () => {
    it("should replace the first match", () => {
        expect(replaceFirstWhere([1, 2, 3], (x) => x > 1, 0)).toEqual([1, 0, 3])
    })

    it("should return the same array when nothing changed", () => {
        const target = [1, 2, 3]
        expect(replaceFirstWhere(target, (x) => x > 3, 0)).toBe(target)
        expect(replaceFirstWhere(target, (x) => x === 2, 2)).toBe(target)
    })

    it("should not change what it was given", () => {
        const target = [1, 2, 3]
        replaceFirstWhere(target, (x) => x > 1, 0)
        expect(target).toEqual([1, 2, 3])
    })

    it("should change what it was given when asked to", () => {
        const target = [1, 2, 3]
        expect(replaceFirstWhere(target, (x) => x > 1, 0, { mut: true })).toBe(target)
        expect(target).toEqual([1, 0, 3])
    })

    it("should not take NaN for a change", () => {
        const target = [Number.NaN]
        expect(replaceFirstWhere(target, Number.isNaN, Number.NaN)).toBe(target)
    })
})
