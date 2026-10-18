import { describe, expect, expectTypeOf, it, vi } from "bun:test"
import { Action } from "../../src/Action"
import { isBatching } from "../../src/internals/reactivity"
import { effect, signal } from "./helpers"

const action = Action

describe("action", () => {
    it("should pass arguments and return the result", () => {
        const add = action((a: number, b: number) => a + b)
        expect(add(1, 2)).toBe(3)
    })

    it("should be batched", () => {
        const a = signal(0)
        const b = signal(0)
        const spy = vi.fn(() => void (a() + b()))
        effect(spy)

        action(() => {
            a(1)
            b(1)
            expect(spy).toHaveBeenCalledTimes(1)
        })()

        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should be untracked", () => {
        const a = signal(0)
        const read = action(() => a())
        const spy = vi.fn(() => void read())
        effect(spy)

        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should restore batching and tracking when the handler throws", () => {
        const a = signal(0)
        const spy = vi.fn(() => void a())
        const fail = action(() => {
            a(1)
            throw new Error("fail")
        })

        effect(() => {
            expect(fail).toThrow("fail")
            spy()
        })

        expect(spy).toHaveBeenCalledTimes(1)
        a(2)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should keep the types of what it wraps", () => {
        const pick = action(<T>(value: T, fallback?: T): T => value ?? fallback!)
        expectTypeOf(pick).toEqualTypeOf<<T>(value: T, fallback?: T) => T>()
        expectTypeOf(pick("a")).toEqualTypeOf<string>()
    })

    it("should only batch until the first await", async () => {
        const a = signal(0)
        const spy = vi.fn(() => void a())
        effect(spy)

        const run = action(async () => {
            a(1)
            a(2)
            const inside = isBatching()
            await Promise.resolve()
            a(3)
            a(4)
            return [inside, isBatching()]
        })

        const result = run()
        expect(spy).toHaveBeenCalledTimes(2)
        expect(await result).toEqual([true, false])
        expect(spy).toHaveBeenCalledTimes(4)
    })
})
