import { describe, expect, it } from "bun:test"
import { pick } from "../../src/Object/pick"

describe("Object.pick", () => {
    it("should keep only the keys, in their order", () => {
        expect(pick({ a: 1, b: 2, c: 3 }, ["c", "a"])).toEqual({ a: 1, c: 3 })
        expect(Object.keys(pick({ a: 1, b: 2, c: 3 }, new Set(["c", "a"] as const)))).toEqual(["c", "a"])
    })

    it("should return a copy", () => {
        const target = { a: 1 }
        expect(pick(target, ["a"])).not.toBe(target)
    })

    it("should read every key, also one the target does not have", () => {
        const target: { a: number, b?: number } = { a: 1 }
        expect(pick(target, ["a", "b"])).toEqual({ a: 1, b: undefined })
        expect(Object.keys(pick(target, ["a", "b"]))).toEqual(["a", "b"])
    })

    it("should keep symbols, numbers, and what is called __proto__ as a property", () => {
        const symbol = Symbol("a")
        expect(pick({ a: 1, [symbol]: 3 }, [symbol])).toEqual({ [symbol]: 3 })
        expect(pick({ 1: "one", 2: "two" }, [1])).toEqual({ 1: "one" })
        const parsed = JSON.parse(`{"__proto__":{"x":1},"a":1}`) as { __proto__: unknown, a: number }
        const result = pick(parsed, ["__proto__"]) as Record<string, unknown>
        expect(Object.keys(result)).toEqual(["__proto__"])
        expect(result["x"]).toBe(undefined)
    })
})
