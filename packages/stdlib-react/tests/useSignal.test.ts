import { Effect, Memo, Signal } from "@monstermann/stdlib"
import { describe, expect, expectTypeOf, it, vi } from "bun:test"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { useSignal } from "../src/useSignal"

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
