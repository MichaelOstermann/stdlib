import { Duration } from "@monstermann/stdlib"
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, jest, vi } from "bun:test"
import { act, createElement, useState } from "react"
import { renderToString } from "react-dom/server"
import { useAlignedTimer } from "../src/useAlignedTimer"
import { fakeDOM, render, unmountAll } from "./dom"

const { MINUTE, SECOND } = Duration
const START = 10 * MINUTE + 30_000

describe("useAlignedTimer", () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: START })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it("should return what select returns", () => {
        const Label = (): string => {
            const label = useAlignedTimer(MINUTE, (now) => now === START)
            expectTypeOf(label).toEqualTypeOf<boolean>()
            expectTypeOf(useAlignedTimer(MINUTE)).toEqualTypeOf<number>()
            return String(label)
        }
        expect(renderToString(createElement(Label))).toBe("true")
    })

    it("should render the current time", () => {
        const Now = (): string => String(useAlignedTimer(MINUTE))
        expect(renderToString(createElement(Now))).toBe(String(START))
    })

    describe("mounted", () => {
        fakeDOM()

        it("should render again on multiples of the interval", () => {
            const renders = vi.fn()
            const container = render(() => {
                renders()
                return String(useAlignedTimer(MINUTE))
            })
            expect(container.textContent).toBe(String(START))

            act(() => jest.advanceTimersByTime(29_999))
            expect(renders).toHaveBeenCalledTimes(1)
            act(() => jest.advanceTimersByTime(1))
            expect(container.textContent).toBe(String(11 * MINUTE))
            act(() => jest.advanceTimersByTime(MINUTE))
            act(() => jest.advanceTimersByTime(MINUTE))
            expect(container.textContent).toBe(String(13 * MINUTE))
            expect(renders).toHaveBeenCalledTimes(4)
        })

        it("should return the current time when it renders for something else", () => {
            let increment = (): void => {}
            const container = render(() => {
                const [count, setCount] = useState(0)
                increment = () => setCount(count + 1)
                return String(useAlignedTimer(MINUTE))
            })
            jest.setSystemTime(START + 10_000)
            act(() => increment())
            expect(container.textContent).toBe(String(START + 10_000))
        })

        it("should only render again when select returns something else", () => {
            const renders = vi.fn()
            const container = render(() => {
                renders()
                return useAlignedTimer(SECOND, (now) => `${Math.floor((now - START) / MINUTE)} minutes`)
            })
            expect(container.textContent).toBe("0 minutes")

            for (let i = 0; i < 59; i++) act(() => jest.advanceTimersByTime(SECOND))
            expect(renders).toHaveBeenCalledTimes(1)
            act(() => jest.advanceTimersByTime(SECOND))
            expect(container.textContent).toBe("1 minutes")
            expect(renders).toHaveBeenCalledTimes(2)
        })

        it("should select with what it rendered last", () => {
            let increment = (): void => {}
            const container = render(() => {
                const [offset, setOffset] = useState(0)
                increment = () => setOffset(offset + MINUTE)
                return String(useAlignedTimer(MINUTE, (now) => Math.floor((now + offset) / (2 * MINUTE))))
            })
            act(() => increment())
            expect(container.textContent).toBe("5")
            // The first select would still return 5.
            act(() => jest.advanceTimersByTime(30_000))
            expect(container.textContent).toBe("6")
        })

        it("should share a timer between components with the same interval", () => {
            const a = render(() => String(useAlignedTimer(MINUTE)))
            const b = render(() => String(useAlignedTimer(MINUTE)))
            render(() => String(useAlignedTimer(2 * MINUTE)))
            expect(jest.getTimerCount()).toBe(2)

            act(() => jest.advanceTimersByTime(30_000))
            expect(a.textContent).toBe(String(11 * MINUTE))
            expect(b.textContent).toBe(String(11 * MINUTE))
        })

        it("should stop the timer once the last component unmounted", () => {
            render(() => String(useAlignedTimer(MINUTE)))
            render(() => String(useAlignedTimer(MINUTE)))
            expect(jest.getTimerCount()).toBe(1)
            unmountAll()
            expect(jest.getTimerCount()).toBe(0)
        })

        it("should render the current time when it mounts again", () => {
            render(() => String(useAlignedTimer(MINUTE)))
            unmountAll()
            jest.advanceTimersByTime(5 * MINUTE)

            const container = render(() => String(useAlignedTimer(MINUTE)))
            expect(container.textContent).toBe(String(15 * MINUTE + 30_000))
            act(() => jest.advanceTimersByTime(30_000))
            expect(container.textContent).toBe(String(16 * MINUTE))
        })

        it("should render the components with the same interval together", () => {
            const renders = vi.fn()
            const a = render(() => String(useAlignedTimer(MINUTE)))
            const b = render(() => {
                renders()
                return String(useAlignedTimer(MINUTE))
            })
            act(() => jest.advanceTimersByTime(30_000))
            expect(a.textContent).toBe(String(11 * MINUTE))
            expect(b.textContent).toBe(String(11 * MINUTE))
            expect(renders).toHaveBeenCalledTimes(2)
        })

        it("should render again when the clock was set back", () => {
            const container = render(() => String(useAlignedTimer(MINUTE)))
            jest.setSystemTime(2 * MINUTE)
            act(() => jest.advanceTimersByTime(30_000))
            expect(container.textContent).toBe(String(2 * MINUTE + 30_000))
            act(() => jest.advanceTimersByTime(30_000))
            expect(container.textContent).toBe(String(3 * MINUTE))
        })
    })
})
