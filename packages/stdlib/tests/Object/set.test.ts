import { describe, expect, it } from "bun:test"
import { set } from "../../src/Object/set"

describe("Object.set", () => {
    it("should set into a copy", () => {
        const target = { a: 1, b: 2 }
        expect(set(target, "b", 3)).toEqual({ a: 1, b: 3 })
        expect(target).toEqual({ a: 1, b: 2 })
    })

    it("should return the same object when nothing changed", () => {
        const target = { a: 1, b: 2 }
        expect(set(target, "b", 2)).toBe(target)
    })

    it("should check keys that are not known until the code runs", () => {
        const target = { a: 1, b: "b" }
        const key = "a" as "a" | "b"
        // @ts-expect-error not a value for every key
        set(target, key, true)
        expect(set(target, "a" as const, 2)).toEqual({ a: 2, b: "b" })
    })

    it("should add a key that is set to undefined", () => {
        const target: { a: number, b?: number } = { a: 1 }
        const result = set(target, "b", undefined)
        expect("b" in result).toBe(true)
        expect(set(result, "b", undefined)).toBe(result)
    })
})
