import { describe, expect, it } from "bun:test"
import { defaults } from "../../src/Object/defaults"

interface Options {
    name?: string | null
    retries?: number
    timeout?: number
}

describe("Object.defaults", () => {
    it("should fill in what is missing, on a copy", () => {
        const target: Options = { retries: 1 }
        expect(defaults(target, { retries: 3, timeout: 1000 })).toEqual({ retries: 1, timeout: 1000 })
        expect(target).toEqual({ retries: 1 })
    })

    it("should fill in what is undefined", () => {
        const target: Options = { retries: undefined, timeout: 5 }
        expect(defaults(target, { retries: 3, timeout: 1000 })).toEqual({ retries: 3, timeout: 5 })
    })

    it("should keep null and other falsy values", () => {
        const target: Options = { name: null, retries: 0 }
        expect<Options>(defaults(target, { name: "a", retries: 3 })).toBe(target)
    })

    it("should return the same object when nothing is missing", () => {
        const target: Options = { retries: 1, timeout: 2 }
        expect<Options>(defaults(target, { retries: 3, timeout: 1000 })).toBe(target)
        expect(defaults(target, {})).toBe(target)
    })

    it("should fill in symbols", () => {
        const symbol = Symbol("a")
        const target: { a: number, [symbol]?: number } = { a: 1 }
        expect(defaults(target, { [symbol]: 2 })).toEqual({ a: 1, [symbol]: 2 })
    })

    it("should treat __proto__ as a key like any other", () => {
        const source = JSON.parse('{ "__proto__": { "a": 1 }, "b": 2 }') as Record<string, unknown>
        const result = defaults({ b: 1 } as Record<string, unknown>, source)
        expect(Object.keys(result)).toEqual(["b", "__proto__"])
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
        expect(result["b"]).toBe(1)
    })

    it("should fill in what is only inherited", () => {
        const toString = (): string => "a"
        expect(Object.hasOwn(defaults({} as { toString?: () => string }, { toString }), "toString")).toBe(true)
    })

    it("should keep the order of keys, new ones last", () => {
        const target: { a?: number, b?: number, c?: number } = { a: undefined, b: 2 }
        expect(Object.keys(defaults(target, { a: 1, c: 3 }))).toEqual(["a", "b", "c"])
    })
})
