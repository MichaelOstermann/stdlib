import { describe, expect, it } from "bun:test"
import { mapProp } from "../../src/Object/mapProp"

describe("Object.mapProp", () => {
    it("should map into a copy", () => {
        const target = { a: 1, b: 2 }
        expect(mapProp(target, "b", (b) => b * 10)).toEqual({ a: 1, b: 20 })
        expect(target).toEqual({ a: 1, b: 2 })
    })

    it("should return the same object when nothing changed", () => {
        const target = { a: 1, b: 2 }
        expect(mapProp(target, "b", (b) => b)).toBe(target)
        const nan = { a: Number.NaN }
        expect(mapProp(nan, "a", () => Number.NaN)).toBe(nan)
    })

    it("should add a key that is mapped to undefined", () => {
        const target: { a: number, b?: number } = { a: 1 }
        const result = mapProp(target, "b", () => undefined)
        expect("b" in result).toBe(true)
        expect(mapProp(result, "b", () => undefined)).toBe(result)
    })

    it("should check the value against the key", () => {
        const target = { a: 1, b: "b" }
        // @ts-expect-error not a number
        mapProp(target, "a", () => "a")
    })
})
