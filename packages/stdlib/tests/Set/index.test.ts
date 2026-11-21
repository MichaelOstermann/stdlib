import { describe, expect, it } from "bun:test"
import { Set } from "../../src/Set"

describe("Set", () => {
    it("should have the functions of @monstermann/stdlib", () => {
        expect(Set.union(new Set([1]), [2])).toEqual(new globalThis.Set([1, 2]))
    })

    it("should behave like the native Set", () => {
        const set = new Set([1, 2])
        expect(Object.getPrototypeOf(set)).toBe(globalThis.Set.prototype)
        expect(set instanceof Set).toBe(true)
        expect(new globalThis.Set() instanceof Set).toBe(true)
        expect(Set.prototype).toBe(globalThis.Set.prototype)
        expect(Set.name).toBe("Set")
        expect(() => (Set as unknown as () => void)()).toThrow()
    })

    it("should leave the native Set alone", () => {
        expect("union" in globalThis.Set).toBe(false)
    })
})
