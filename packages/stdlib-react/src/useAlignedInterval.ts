import { Interval } from "@monstermann/stdlib"
import { useEffect, useReducer } from "react"
import { useLatest } from "./internals/useLatest"

/**
 * `useAlignedInterval(every, select?)`
 *
 * Returns `Date.now()`, or `select(Date.now())`. Renders the component again every `every`
 * milliseconds. Use it for text relative to now: "5 minutes ago", "today". Every render reads the
 * time again. The timer only adds renders.
 *
 * - renders happen on multiples of `every` since the epoch, like `Interval.aligned`:
 *   `Duration.MINUTE` on the minute, `Duration.HOUR` on the hour, in UTC
 * - with `select`, the component only renders again when `select` returns a new value. Values are
 *   compared with `Object.is`, so return a string or a number, not a new object
 * - components with the same `every` share a timer and render together. The timer stops when the
 *   last of these components unmounts
 */
export function useAlignedInterval(every: number): number
export function useAlignedInterval<T>(every: number, select: (now: number) => T): T
export function useAlignedInterval<T>(every: number, select?: (now: number) => T): T | number {
    "use no memo"

    const [, render] = useReducer((count: number) => count + 1, 0)
    const now = Date.now()
    const value = select ? select(now) : now
    // The value on screen: `useLatest` updates in a layout effect, which a discarded render never reaches.
    const committed = useLatest({ select, value })

    useEffect(() => Interval.aligned(every, (now) => {
        const { select, value } = committed.current
        if (!select || !Object.is(select(now), value)) render()
    }), [every, committed])

    return value
}
