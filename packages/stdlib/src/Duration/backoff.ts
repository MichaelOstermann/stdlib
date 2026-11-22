/**
 * # backoff
 *
 * Returns how long to wait before trying again. The first `attempt` is `0` and waits `min`. Each
 * following attempt waits twice as long, but never longer than `max`.
 *
 * ## Example
 *
 * ```ts
 * Duration.backoff(0, Duration.SECOND, Duration.MINUTE); // 1_000
 * Duration.backoff(1, Duration.SECOND, Duration.MINUTE); // 2_000
 * Duration.backoff(3, Duration.SECOND, Duration.MINUTE); // 8_000
 * Duration.backoff(9, Duration.SECOND, Duration.MINUTE); // 60_000
 * ```
 */
export function backoff(attempt: number, min: number, max: number): number {
    return Math.min(max, min * 2 ** attempt)
}
