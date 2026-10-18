import { Timer } from "@monstermann/stdlib"
import { useEffect, useReducer } from "react"
import { useLatest } from "./internals/useLatest"

/**
 * `useAlignedTimer(every, select?)`
 *
 * Returns `Date.now()`, or what `select` returns for it, and renders the component again every `every` milliseconds, for what is shown relative to now: "5 minutes ago", "today".
 * Every render reads the time again, the timer only adds renders.
 *
 * - it renders again on multiples of `every` since the epoch, like `Timer.aligned`: `Duration.MINUTE` on the minute, `Duration.HOUR` on the hour, in UTC
 * - with `select` it only renders again when `select` returns something else, compared with `Object.is`: a string or a number, not a new object
 * - the components with the same `every` share a timer and render together, the timer stops once the last one unmounted
 *
 * ```tsx
 * function TimeAgo({ at }: { at: number }) {
 *     const now = useAlignedTimer(Duration.MINUTE);
 *     return `${Math.floor((now - at) / Duration.MINUTE)} minutes ago`;
 * }
 *
 * // Checks every second, renders when the label changes: every second for "5 seconds ago", every hour for "3 hours ago".
 * function TimeAgo({ at }: { at: number }) {
 *     return useAlignedTimer(Duration.SECOND, now => formatAgo(now - at));
 * }
 * ```
 */
export function useAlignedTimer(every: number): number
export function useAlignedTimer<T>(every: number, select: (now: number) => T): T
export function useAlignedTimer<T>(every: number, select?: (now: number) => T): T | number {
    "use no memo"

    const [, render] = useReducer((count: number) => count + 1, 0)
    const now = Date.now()
    const value = select ? select(now) : now
    // What is on screen: a render that React throws away does not get here.
    const committed = useLatest({ select, value })

    useEffect(() => Timer.aligned(every, (now) => {
        const { select, value } = committed.current
        if (!select || !Object.is(select(now), value)) render()
    }), [every, committed])

    return value
}
