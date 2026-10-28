import { describe, expect, it } from "bun:test"
import { merge } from "../../src/Object/merge"

describe("Object.merge", () => {
    it("should merge into a copy", () => {
        const target = { a: 1, b: 2 }
        expect(merge(target, { b: 3 })).toEqual({ a: 1, b: 3 })
        expect(target).toEqual({ a: 1, b: 2 })
    })

    it("should return the same object when nothing changed", () => {
        const target = { a: 1, b: 2 }
        expect(merge(target, { b: 2 })).toBe(target)
        expect(merge(target, {})).toBe(target)
    })

    it("should merge symbols", () => {
        const symbol = Symbol("a")
        const target: { a: number, [symbol]?: number } = { a: 1 }
        expect(merge(target, { [symbol]: 2 })).toEqual({ a: 1, [symbol]: 2 })
        expect(merge({ a: 1, [symbol]: 2 }, { [symbol]: 2 })).toEqual({ a: 1, [symbol]: 2 })
    })

    it("should return the target for a missing key that is set to undefined", () => {
        const target: { a: number, b?: number } = { a: 1 }
        expect(merge(target, { b: undefined })).toBe(target)
    })

    it("should treat __proto__ as a key like any other", () => {
        const source = JSON.parse('{ "__proto__": { "a": 1 }, "b": 2 }') as Record<string, unknown>
        const result = Object.assign({}, merge({ b: 1 } as Record<string, unknown>, source))
        expect(Object.keys(merge({ b: 1 } as Record<string, unknown>, source))).toEqual(["b", "__proto__"])
        expect(Object.getPrototypeOf(merge({ b: 1 } as Record<string, unknown>, source))).toBe(Object.prototype)
        expect(result["b"]).toBe(2)
    })

    it("should keep the order of keys, new ones last", () => {
        expect(Object.keys(merge({ a: 1, b: 2 } as Record<string, number>, Object.fromEntries([["c", 3], ["a", 0]])))).toEqual(["a", "b", "c"])
    })
})
