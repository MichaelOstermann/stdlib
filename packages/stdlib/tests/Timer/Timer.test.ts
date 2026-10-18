import { afterEach, beforeEach, describe, expect, it, jest, vi } from "bun:test"
import { Duration } from "../../src/Duration/index"
import { Timer } from "../../src/Timer/index"

const { DAY, MINUTE, SECOND } = Duration
const START = 10 * MINUTE + 30_000

describe("Timer", () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: START })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe("timeout", () => {
        it("should call fn once after the delay", () => {
            const fn = vi.fn()
            Timer.timeout(SECOND, fn)
            jest.advanceTimersByTime(SECOND - 1)
            expect(fn).toHaveBeenCalledTimes(0)
            jest.advanceTimersByTime(1)
            jest.advanceTimersByTime(SECOND)
            expect(fn).toHaveBeenCalledTimes(1)
        })

        it("should not call fn once cancelled", () => {
            const fn = vi.fn()
            Timer.timeout(SECOND, fn)()
            jest.advanceTimersByTime(SECOND)
            expect(fn).toHaveBeenCalledTimes(0)
            expect(jest.getTimerCount()).toBe(0)
        })
    })

    describe("interval", () => {
        it("should call fn every delay until stopped", () => {
            const fn = vi.fn()
            const stop = Timer.interval(SECOND, fn)
            jest.advanceTimersByTime(3 * SECOND)
            expect(fn).toHaveBeenCalledTimes(3)
            stop()
            jest.advanceTimersByTime(3 * SECOND)
            expect(fn).toHaveBeenCalledTimes(3)
        })
    })

    describe("aligned", () => {
        it("should throw for an interval that never or always ticks", () => {
            for (const every of [0, -MINUTE, Number.NaN, 30 * DAY, Infinity]) {
                expect(() => Timer.aligned(every, () => {})).toThrow(RangeError)
            }
        })

        it("should call fn with the time on multiples of the interval", () => {
            const fn = vi.fn()
            const stop = Timer.aligned(MINUTE, fn)
            jest.advanceTimersByTime(29_999)
            expect(fn).toHaveBeenCalledTimes(0)
            jest.advanceTimersByTime(1)
            jest.advanceTimersByTime(MINUTE)
            expect(fn.mock.calls).toEqual([[11 * MINUTE], [12 * MINUTE]])
            stop()
        })

        it("should share a timer between functions with the same interval", () => {
            const a = vi.fn()
            const b = vi.fn()
            const stopA = Timer.aligned(MINUTE, a)
            const stopB = Timer.aligned(MINUTE, b)
            const stopC = Timer.aligned(2 * MINUTE, () => {})
            expect(jest.getTimerCount()).toBe(2)

            jest.advanceTimersByTime(30_000)
            expect(a).toHaveBeenCalledWith(11 * MINUTE)
            expect(b).toHaveBeenCalledWith(11 * MINUTE)

            stopA()
            expect(jest.getTimerCount()).toBe(2)
            stopB()
            stopC()
            expect(jest.getTimerCount()).toBe(0)
        })

        it("should keep a function that was passed twice when one of them stops", () => {
            const fn = vi.fn()
            const stop = Timer.aligned(MINUTE, fn)
            Timer.aligned(MINUTE, fn)()
            jest.advanceTimersByTime(30_000)
            expect(fn).toHaveBeenCalledTimes(1)
            stop()
        })

        it("should stop once, also when stopped twice", () => {
            const fn = vi.fn()
            const stop = Timer.aligned(MINUTE, () => {})
            stop()
            const stopAgain = Timer.aligned(MINUTE, fn)
            stop()
            jest.advanceTimersByTime(30_000)
            expect(fn).toHaveBeenCalledTimes(1)
            stopAgain()
        })

        it("should stop when the last function stops during a tick", () => {
            const stop = Timer.aligned(MINUTE, () => stop())
            jest.advanceTimersByTime(30_000)
            expect(jest.getTimerCount()).toBe(0)
        })

        it("should start from the current time once used again", () => {
            Timer.aligned(MINUTE, () => {})()
            jest.advanceTimersByTime(5 * MINUTE)
            const fn = vi.fn()
            const stop = Timer.aligned(MINUTE, fn)
            jest.advanceTimersByTime(30_000)
            expect(fn.mock.calls).toEqual([[16 * MINUTE]])
            stop()
        })

        it("should tick when the clock was set back", () => {
            const fn = vi.fn()
            const stop = Timer.aligned(MINUTE, fn)
            jest.setSystemTime(2 * MINUTE)
            jest.advanceTimersByTime(30_000)
            expect(fn.mock.calls).toEqual([[2 * MINUTE + 30_000]])
            jest.advanceTimersByTime(30_000)
            expect(fn.mock.calls).toEqual([[2 * MINUTE + 30_000], [3 * MINUTE]])
            stop()
        })
    })
})

describe("Timer with unref", () => {
    it("should let the process exit while a timer is pending", () => {
        const setTimeout = vi.spyOn(globalThis, "setTimeout")
        const setInterval = vi.spyOn(globalThis, "setInterval")
        const cancelTimeout = Timer.timeout(MINUTE, () => {}, { unref: true })
        const stopInterval = Timer.interval(MINUTE, () => {}, { unref: true })
        expect((setTimeout.mock.results[0]!.value as { hasRef: () => boolean }).hasRef()).toBe(false)
        expect((setInterval.mock.results[0]!.value as { hasRef: () => boolean }).hasRef()).toBe(false)
        cancelTimeout()
        stopInterval()
        setTimeout.mockRestore()
        setInterval.mockRestore()
    })

    it("should keep the process alive without it", () => {
        const setTimeout = vi.spyOn(globalThis, "setTimeout")
        const cancel = Timer.timeout(MINUTE, () => {})
        expect((setTimeout.mock.results[0]!.value as { hasRef: () => boolean }).hasRef()).toBe(true)
        cancel()
        setTimeout.mockRestore()
    })
})
