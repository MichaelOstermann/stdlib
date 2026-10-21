import { describe, expect, it } from "bun:test"
import { uniqueBy } from "../../src/Array/uniqueBy"

describe("Array.uniqueBy", () => {
    it("should remove duplicates, keeping the first occurrence", () => {
        const a = { id: 1, title: "a" }
        const b = { id: 2, title: "b" }
        const c = { id: 1, title: "c" }
        const d = { id: 3, title: "d" }
        const e = { id: 2, title: "e" }
        expect(uniqueBy([a, b, c, d, e], (task) => task.id)).toEqual([a, b, d])
    })

    it("should return the same array when there are no duplicates", () => {
        const target = [1, 2, 3]
        expect(uniqueBy(target, (value) => value)).toBe(target)
        expect(uniqueBy([], (value) => value)).toEqual([])
    })

    it("should not change what it was given", () => {
        const target = ["a", "A", "b"]
        expect(uniqueBy(target, (text) => text.toLowerCase())).toEqual(["a", "b"])
        expect(target).toEqual(["a", "A", "b"])
    })

    it("should call by once for each element, with its index and the array", () => {
        const target = ["a", "a", "b"]
        const calls: unknown[] = []
        uniqueBy(target, (value, index, array) => {
            calls.push([value, index, array === target])
            return value
        })
        expect(calls).toEqual([["a", 0, true], ["a", 1, true], ["b", 2, true]])
    })
})
