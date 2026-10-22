import { afterEach, beforeEach, describe, expect, it, jest, vi } from "bun:test"
import { Duration } from "../../src/Duration/index"
import { Interval } from "../../src/Interval/index"

const { DAY, MINUTE } = Duration
const START = 10 * MINUTE + 30_000

describe("Interval", () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: START })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe("aligned", () => {
        it("should throw for an interval that never or always ticks", () => {
            for (const every of [0, -MINUTE, Number.NaN, 30 * DAY, Infinity]) {
                expect(() => Interval.aligned(every, () => {})).toThrow(RangeError)
            }
        })

        it("should call fn with the time on multiples of the interval", () => {
            const fn = vi.fn()
            const stop = Interval.aligned(MINUTE, fn)
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
            const stopA = Interval.aligned(MINUTE, a)
            const stopB = Interval.aligned(MINUTE, b)
            const stopC = Interval.aligned(2 * MINUTE, () => {})
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
            const stop = Interval.aligned(MINUTE, fn)
            Interval.aligned(MINUTE, fn)()
            jest.advanceTimersByTime(30_000)
            expect(fn).toHaveBeenCalledTimes(1)
            stop()
        })

        it("should stop once, also when stopped twice", () => {
            const fn = vi.fn()
            const stop = Interval.aligned(MINUTE, () => {})
            stop()
            const stopAgain = Interval.aligned(MINUTE, fn)
            stop()
            jest.advanceTimersByTime(30_000)
            expect(fn).toHaveBeenCalledTimes(1)
            stopAgain()
        })

        it("should stop when the last function stops during a tick", () => {
            const stop = Interval.aligned(MINUTE, () => stop())
            jest.advanceTimersByTime(30_000)
            expect(jest.getTimerCount()).toBe(0)
        })

        it("should call the others and keep ticking when a function throws", () => {
            const fn = vi.fn()
            const stopThrowing = Interval.aligned(MINUTE, () => {
                throw new Error("failed")
            })
            const stop = Interval.aligned(MINUTE, fn)
            expect(() => jest.advanceTimersByTime(30_000)).toThrow("failed")
            expect(fn).toHaveBeenCalledTimes(1)
            expect(jest.getTimerCount()).toBe(1)
            stopThrowing()
            jest.advanceTimersByTime(MINUTE)
            expect(fn).toHaveBeenCalledTimes(2)
            stop()
        })

        it("should start from the current time once used again", () => {
            Interval.aligned(MINUTE, () => {})()
            jest.advanceTimersByTime(5 * MINUTE)
            const fn = vi.fn()
            const stop = Interval.aligned(MINUTE, fn)
            jest.advanceTimersByTime(30_000)
            expect(fn.mock.calls).toEqual([[16 * MINUTE]])
            stop()
        })

        it("should tick when the clock was set back", () => {
            const fn = vi.fn()
            const stop = Interval.aligned(MINUTE, fn)
            jest.setSystemTime(2 * MINUTE)
            jest.advanceTimersByTime(30_000)
            expect(fn.mock.calls).toEqual([[2 * MINUTE + 30_000]])
            jest.advanceTimersByTime(30_000)
            expect(fn.mock.calls).toEqual([[2 * MINUTE + 30_000], [3 * MINUTE]])
            stop()
        })
    })
})
