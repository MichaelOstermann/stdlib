import { describe, expect, expectTypeOf, it, vi } from "bun:test"
import { Signal } from "../../src/Signal"
import { effect } from "./helpers"

describe("Signal", () => {
    it("should read, replace and change its value", () => {
        const $count = Signal(0)
        expect($count()).toBe(0)
        $count(1)
        expect($count()).toBe(1)
        $count(count => count + 1)
        expect($count()).toBe(2)
        expect($count.kind).toBe("Signal")
    })

    it("should hold a function that a function returns", () => {
        const a = (): number => 1
        const b = (): number => 2
        const $fn = Signal(a)
        $fn(() => b)
        expect($fn()).toBe(b)
    })

    it("should replace its value with undefined", () => {
        const $value = Signal<number | undefined>(1)
        const spy = vi.fn(() => void $value())
        effect(spy)
        $value(undefined)
        expect($value()).toBe(undefined)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should update nothing when it has the value already", () => {
        const $count = Signal(0)
        const spy = vi.fn(() => void $count())
        effect(spy)
        $count(0)
        $count(count => count)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should ask equals for what is not the same", () => {
        const equals = vi.fn((before: { id: number }, after: { id: number }) => before.id === after.id)
        const first = { id: 1 }
        const $value = Signal(first, { equals })
        const spy = vi.fn(() => void $value())
        effect(spy)

        $value(first)
        expect(equals).toHaveBeenCalledTimes(0)

        $value({ id: 1 })
        expect($value()).toBe(first)
        expect(spy).toHaveBeenCalledTimes(1)

        $value({ id: 2 })
        expect($value()).toEqual({ id: 2 })
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should tell when it is read", () => {
        const onRead = vi.fn()
        const $count = Signal(0, { onRead })
        $count()
        $count(1)
        $count()
        expect(onRead).toHaveBeenCalledTimes(2)
    })

    it("should tell when it is watched, and when it no longer is", () => {
        const onUnwatch = vi.fn()
        const onWatch = vi.fn(() => onUnwatch)
        const $count = Signal(0, { onWatch })

        $count()
        expect(onWatch).toHaveBeenCalledTimes(0)

        const a = effect(() => void $count())
        const b = effect(() => void $count())
        expect(onWatch).toHaveBeenCalledTimes(1)

        a()
        expect(onUnwatch).toHaveBeenCalledTimes(0)
        b()
        expect(onUnwatch).toHaveBeenCalledTimes(1)

        effect(() => void $count())
        expect(onWatch).toHaveBeenCalledTimes(2)
    })

    it("should know what it holds", () => {
        expectTypeOf(Signal(0)).toEqualTypeOf<Signal<number>>()
        expectTypeOf(Signal<string>(null)).toEqualTypeOf<Signal<string | null>>()
        expectTypeOf(Signal<string>()).toEqualTypeOf<Signal<string | undefined>>()
        expectTypeOf(Signal(0)()).toEqualTypeOf<number>()
        // @ts-expect-error not a number
        Signal(0)("a")
    })
})
