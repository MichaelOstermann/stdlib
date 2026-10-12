import { Batch, Effect, Memo, Signal } from "@monstermann/stdlib"
import { describe, expect, expectTypeOf, it, vi } from "bun:test"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { subscribe, toSignal } from "../src/internals/store"
import { useSignal } from "../src/useSignal"

describe("toSignal", () => {
    it("should keep signals and memos as they are", () => {
        const $count = Signal(1)
        const $double = Memo(() => $count() * 2)
        expect(toSignal($count)).toBe($count)
        expect(toSignal($double)).toBe($double)
    })

    it("should turn a function into a memo", () => {
        const $count = Signal(1)
        const compute = vi.fn(() => $count() > 1)
        const read = toSignal(compute)
        expect(read).not.toBe(compute)
        expect(read()).toBe(false)
        expect(read()).toBe(false)
        expect(compute).toHaveBeenCalledTimes(1)
    })
})

describe("subscribe", () => {
    it("should tell about changes, and not about the value it starts with", () => {
        const $count = Signal(1)
        const onChange = vi.fn()
        subscribe($count, onChange)
        expect(onChange).toHaveBeenCalledTimes(0)

        $count(2)
        $count(2)
        expect(onChange).toHaveBeenCalledTimes(1)

        Batch(() => {
            $count(3)
            $count(4)
        })
        expect(onChange).toHaveBeenCalledTimes(2)
    })

    it("should only tell when a function returns something else", () => {
        const $count = Signal(1)
        const onChange = vi.fn()
        subscribe(toSignal(() => $count() > 1), onChange)

        $count(2)
        $count(3)
        expect(onChange).toHaveBeenCalledTimes(1)
    })

    it("should stop when asked to", () => {
        const onUnwatch = vi.fn()
        const $count = Signal(1, { onWatch: () => onUnwatch })
        const onChange = vi.fn()
        const stop = subscribe($count, onChange)

        stop()
        $count(2)
        expect(onChange).toHaveBeenCalledTimes(0)
        expect(onUnwatch).toHaveBeenCalledTimes(1)
    })

    it("should not make an effect depend on what is read when it is told", () => {
        const $count = Signal(1)
        const $other = Signal(1)
        subscribe($count, () => void $other())
        const outer = vi.fn(() => $count(count => count + 1))
        Effect(() => outer())
        $other(2)
        expect(outer).toHaveBeenCalledTimes(1)
    })
})

describe("useSignal", () => {
    it("should render the value of signals, memos and functions", () => {
        const $count = Signal(1)
        const $double = Memo(() => $count() * 2)

        function Counter({ offset }: { offset: number }): string {
            const count = useSignal($count)
            const double = useSignal($double)
            const total = useSignal(() => $count() + offset)
            return [count, double, total].join(" ")
        }

        expect(renderToString(createElement(Counter, { offset: 10 }))).toBe("1 2 11")
        $count(2)
        expect(renderToString(createElement(Counter, { offset: 10 }))).toBe("2 4 12")
    })

    it("should not make an effect depend on what is rendered", () => {
        const $count = Signal(1)
        const Counter = (): string => String(useSignal($count))
        const spy = vi.fn(() => renderToString(createElement(Counter)))
        Effect(() => void spy())
        $count(2)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should know what it returns", () => {
        // Never called, hooks only work while rendering.
        const types = (): void => {
            expectTypeOf(useSignal(Signal(1))).toEqualTypeOf<number>()
            expectTypeOf(useSignal(Memo(() => "a"))).toEqualTypeOf<string>()
            expectTypeOf(useSignal(() => true)).toEqualTypeOf<boolean>()
            // @ts-expect-error not something to read
            useSignal(1)
        }
        expect(types).toBeFunction()
    })
})
