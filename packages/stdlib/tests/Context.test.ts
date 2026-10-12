import { describe, expect, expectTypeOf, it } from "bun:test"
import { Context } from "../src/Context"

describe("Context", () => {
    it("should be what it was created with, or nothing", () => {
        expect(Context<string>()()).toBe(undefined)
        expect(Context(1)()).toBe(1)
    })

    it("should be set while a function runs, and return what it returns", () => {
        const context = Context<string>()
        expect(context.run("a", () => `${context()}b`)).toBe("ab")
        expect(context()).toBe(undefined)
    })

    it("should be nested", () => {
        const depth = Context(0)
        const seen: number[] = []
        depth.run(depth() + 1, () => {
            seen.push(depth())
            depth.run(depth() + 1, () => seen.push(depth()))
            seen.push(depth())
        })
        expect(seen).toEqual([1, 2, 1])
        expect(depth()).toBe(0)
    })

    it("should be back to what it was when the function throws", () => {
        const context = Context("a")
        expect(() => context.run("b", () => {
            throw new Error(context())
        })).toThrow("b")
        expect(context()).toBe("a")
    })

    it("should not last across an await", async () => {
        const context = Context("a")
        const seen = await context.run("b", async () => {
            const before = context()
            await Promise.resolve()
            return [before, context()]
        })
        expect(seen).toEqual(["b", "a"])
    })

    it("should know what it holds", () => {
        expectTypeOf(Context<string>()).toEqualTypeOf<Context<string | undefined>>()
        expectTypeOf(Context(1)).toEqualTypeOf<Context<number>>()
        expectTypeOf(Context(1).run(2, () => "a")).toEqualTypeOf<string>()
        // @ts-expect-error not a number
        Context(1).run("a", () => {})
    })
})
