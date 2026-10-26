/**
 * # backoff
 *
 * ```ts
 * function Duration.backoff(attempt: number, min: number, max: number): number
 * ```
 *
 * Returns how long to wait before trying again: `min` after the first `attempt`, which is `0`,
 * twice as long after each one that follows, and never longer than `max`.
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
