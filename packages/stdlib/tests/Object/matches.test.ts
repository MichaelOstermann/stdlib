import { describe, expect, expectTypeOf, it } from "bun:test"
import { matches } from "../../src/Object/matches"

type Input = { type: "click", x: number } | { type: "key", key: string } | { type: "scroll", delta: number }

describe("Object.matches", () => {
    it("should tell whether each property of the shape has the same value", () => {
        const input = { key: "Enter", type: "key" }
        expect(matches(input, { type: "key" })).toBe(true)
        expect(matches(input, { key: "Enter", type: "key" })).toBe(true)
        expect(matches(input, { key: "Escape", type: "key" })).toBe(false)
        expect(matches(input, {})).toBe(true)
    })

    it("should compare with Object.is", () => {
        expect(matches({ a: Number.NaN }, { a: Number.NaN })).toBe(true)
        expect(matches({ a: 0 }, { a: -0 })).toBe(false)
        expect(matches({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false)
    })

    it("should narrow a union to the members that fit", () => {
        const input = { type: "click", x: 1 } as Input
        if (matches(input, { type: "click" })) expectTypeOf(input.x).toEqualTypeOf<number>()
        if (matches(input, { key: "Enter", type: "key" })) expectTypeOf(input.key).toEqualTypeOf<"Enter">()
    })

    it("should reject a shape that fits no member", () => {
        const input = { type: "click", x: 1 } as Input
        // @ts-expect-error misspelled
        matches(input, { tpye: "click" })
        // @ts-expect-error not a type of any member
        matches(input, { type: "drag" })
        // @ts-expect-error a key of one member with the type of another
        matches(input, { key: "Enter", type: "click" })
    })
})
