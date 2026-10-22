import { describe, expect, it } from "bun:test"
import { set } from "../../src/Map/set"

describe("Map.set", () => {
    it("should set an entry in a copy", () => {
        const target = new Map([["a", 1]])
        const result = set(target, "b", 2)
        expect([...result]).toEqual([["a", 1], ["b", 2]])
        expect([...target]).toEqual([["a", 1]])
    })

    it("should return the same map when nothing changed", () => {
        const target = new Map<string, number | undefined>([["a", 1], ["b", undefined]])
        expect(set(target, "a", 1)).toBe(target)
        expect(set(target, "b", undefined)).toBe(target)
    })

    it("should add a key that is set to undefined", () => {
        const result = set(new Map<string, number | undefined>(), "a", undefined)
        expect(result.has("a")).toBe(true)
    })
})
