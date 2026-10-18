import type { TimerOptions } from "./index"

/**
 * # interval
 *
 * ```ts
 * function Timer.interval(delay: number, fn: () => void, options?: TimerOptions): () => void
 * ```
 *
 * Calls `fn` every `delay` milliseconds, like `setInterval`. Returns what stops it.
 * For something that happens on the minute or on the hour, see `Timer.aligned`.
 *
 * - `unref` lets the process exit while the timer is pending, and does nothing in browsers
 *
 * ## Example
 *
 * ```ts
 * const stop = Timer.interval(Duration.HOUR, prune, { unref: true });
 * stop();
 * ```
 *
 */
export function interval(delay: number, fn: () => void, options?: TimerOptions): () => void {
    const timer = setInterval(fn, delay)
    if (options?.unref) (timer as { unref?: () => void }).unref?.()
    return () => clearInterval(timer)
}
