import type { TimerOptions } from "./index"

/**
 * # timeout
 *
 * ```ts
 * function Timer.timeout(delay: number, fn: () => void, options?: TimerOptions): () => void
 * ```
 *
 * Calls `fn` once after the milliseconds of `delay`, like `setTimeout`. Returns what cancels it.
 *
 * - `unref` lets the process exit while the timer is pending, and does nothing in browsers
 *
 * ## Example
 *
 * ```ts
 * const cancel = Timer.timeout(Duration.SECOND, () => console.log("a second later"));
 * cancel();
 *
 * Timer.timeout(Duration.HOUR, cleanup, { unref: true });
 * ```
 *
 */
export function timeout(delay: number, fn: () => void, options?: TimerOptions): () => void {
    const timer = setTimeout(fn, delay)
    if (options?.unref) (timer as { unref?: () => void }).unref?.()
    return () => clearTimeout(timer)
}
