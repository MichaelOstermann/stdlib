/**
 * # jitter
 *
 * Returns `duration` plus a random extra of up to `factor` times `duration`. `factor` is `0.2` by
 * default. The result is never shorter than `duration`, so a requested wait is always honored.
 *
 * ## Example
 *
 * ```ts
 * Duration.jitter(Duration.SECOND); // 1_000 – 1_200
 * Duration.jitter(Duration.SECOND, 0.5); // 1_000 – 1_500
 * Duration.jitter(Duration.SECOND, 0); // 1_000
 * ```
 */
export function jitter(duration: number, factor: number = 0.2): number {
    return Math.round(duration + Math.random() * duration * factor)
}
