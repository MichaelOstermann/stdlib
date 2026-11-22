import { describe, expect, expectTypeOf, it } from "bun:test"
import { prop } from "../../src/Object/prop"

type Input = { type: "click", x: number } | { type: "key", key: string }

describe("Object.prop", () => {
    it("should read the property", () => {
        const click: Input = { type: "click", x: 1 }
        const key: Input = { key: "Enter", type: "key" }
        expect(prop(click, "x")).toBe(1)
        expect(prop(key, "x")).toBeUndefined()
        expect(prop(key, "type")).toBe("key")
    })

    it("should take the keys of any member of a union", () => {
        const input = { type: "click", x: 1 } as Input
        expectTypeOf(prop(input, "x")).toEqualTypeOf<number | undefined>()
        expectTypeOf(prop(input, "key")).toEqualTypeOf<string | undefined>()
        expectTypeOf(prop(input, "type")).toEqualTypeOf<"click" | "key">()
        // @ts-expect-error misspelled
        prop(input, "y")
    })

    it("should be the property for an object that is not a union", () => {
        const target: { a: number, b?: string } = { a: 1 }
        expectTypeOf(prop(target, "a")).toEqualTypeOf<number>()
        expectTypeOf(prop(target, "b")).toEqualTypeOf<string | undefined>()
    })
})
