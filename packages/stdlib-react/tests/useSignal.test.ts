import { Effect, Memo, Signal } from "@monstermann/stdlib"
import { describe, expect, expectTypeOf, it, vi } from "bun:test"
import { act, createElement, useLayoutEffect, useState } from "react"
import { renderToString } from "react-dom/server"
import { useSignal } from "../src/useSignal"
import { fakeDOM, render } from "./dom"

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

    describe("mounted", () => {
        fakeDOM()

        it("should not depend on what the component reads outside of it", () => {
            const $a = Signal(1)
            const $other = Signal(1)
            const renders = vi.fn()
            // Created once, as React Compiler would: a function that is new on every render is a memo that is new on every render.
            const read = (): number => $a()

            const container = render(() => {
                renders()
                const [initial] = useState(() => $other())
                return `${useSignal(read)} ${initial}`
            })
            expect(container.textContent).toBe("1 1")

            act(() => $other(2))
            expect(renders).toHaveBeenCalledTimes(1)

            act(() => $a(2))
            expect(renders).toHaveBeenCalledTimes(2)
            expect(container.textContent).toBe("2 1")
        })

        it("should only render again when a function returns something else", () => {
            const $list = Signal([{ id: 1, name: "a" }, { id: 2, name: "b" }])
            const renders = vi.fn()
            const find = (): { id: number, name: string } | undefined => $list().find(item => item.id === 1)

            const container = render(() => {
                renders()
                return useSignal(find)?.name
            })
            expect(container.textContent).toBe("a")

            act(() => $list(list => list.map(item => item.id === 2 ? { ...item, name: "c" } : item)))
            act(() => $list(list => [...list, { id: 3, name: "d" }]))
            expect(renders).toHaveBeenCalledTimes(1)

            act(() => $list(list => list.map(item => item.id === 1 ? { ...item, name: "e" } : item)))
            expect(renders).toHaveBeenCalledTimes(2)
            expect(container.textContent).toBe("e")
        })

        it("should render what changed between rendering and subscribing", () => {
            const $a = Signal(1)
            const read = (): number => $a() * 10

            const container = render(() => {
                // Runs before React subscribes, which happens in a passive effect.
                useLayoutEffect(() => void $a(2), [])
                return String(useSignal(read))
            })
            expect(container.textContent).toBe("20")

            act(() => $a(3))
            expect(container.textContent).toBe("30")
        })

        it("should return the same value while nothing changed, also for a function that returns something new", () => {
            const $a = Signal(1)
            const renders = vi.fn()
            const error = vi.spyOn(console, "error").mockImplementation(() => {})
            const read = (): { a: number } => ({ a: $a() })

            try {
                const container = render(() => {
                    renders()
                    return String(useSignal(read).a)
                })
                expect(renders).toHaveBeenCalledTimes(1)

                act(() => $a(2))
                expect(renders).toHaveBeenCalledTimes(2)
                expect(container.textContent).toBe("2")
                expect(error).not.toHaveBeenCalled()
            }
            finally {
                error.mockRestore()
            }
        })
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
