import { Emitter } from "../Emitter"

/** The longest delay of `setTimeout`, about 24.8 days: a longer one fires right away, and the clock would tick without end. */
const MAX_INTERVAL = 2_147_483_647

interface Clock {
    onTick: Emitter<number>
    stop: () => void
}

/** The clocks that have listeners, one per interval. */
const clocks = new Map<number, Clock>()

/**
 * # aligned
 *
 * ```ts
 * function Timer.aligned(every: number, fn: (now: number) => void): () => void
 * ```
 *
 * Calls `fn` with `Date.now()` on every multiple of `every` since the epoch: `Duration.MINUTE` on the minute, `Duration.HOUR` on the hour. Returns what stops it.
 * For what is shown relative to now: "5 minutes ago", "today".
 *
 * - `every` is at most `2_147_483_647`, about 24.8 days, the longest delay of `setTimeout`
 * - the multiples are in UTC: `Duration.DAY` is not at local midnight, `Duration.HOUR` not on the hour where the offset is in half hours
 * - every function with the same `every` shares a timer and is called in the same batch, the timer stops once the last one stopped
 * - the time is read again for every multiple, so the clock stays on them across drift, sleep and the clock being set
 *
 * ## Example
 *
 * ```ts
 * const stop = Timer.aligned(Duration.MINUTE, now => console.log(new Date(now)));
 * stop();
 *
 * // A signal of the time, every minute.
 * const $now = Signal(Date.now());
 * const stopNow = Timer.aligned(Duration.MINUTE, $now);
 * ```
 *
 */
export function aligned(every: number, fn: (now: number) => void): () => void {
    if (!(every > 0)) throw new RangeError("Timer.aligned: an interval below or at 0, or NaN, ticks without end.")
    if (every > MAX_INTERVAL) throw new RangeError("Timer.aligned: an interval longer than setTimeout takes, about 24.8 days, ticks without end.")

    let clock = clocks.get(every)
    if (!clock) clocks.set(every, clock = start(every))

    // A function of its own, so the same `fn` twice is two listeners: the emitter keeps them in a `Set`.
    const remove = clock.onTick((now) => fn(now))
    let isStopped = false

    return () => {
        if (isStopped) return
        isStopped = true
        remove()
        if (clock.onTick.listeners.size === 0) {
            clock.stop()
            clocks.delete(every)
        }
    }
}

function start(every: number): Clock {
    const onTick = Emitter<number>()
    let next = boundary(Date.now(), every)
    let timer = setTimeout(tick, next - Date.now())
    let isStopped = false

    function tick(): void {
        const now = Date.now()
        // A timer can fire a moment before the multiple, a clock that was set back long before it.
        if (now >= next || now < next - every) {
            next = boundary(now, every)
            onTick(now)
            // The last listener stopped during the tick.
            if (isStopped) return
        }
        timer = setTimeout(tick, next - now)
    }

    return {
        onTick,
        stop: () => {
            isStopped = true
            clearTimeout(timer)
        },
    }
}

/** The first multiple of `every` after `now`. */
function boundary(now: number, every: number): number {
    return (Math.floor(now / every) + 1) * every
}
