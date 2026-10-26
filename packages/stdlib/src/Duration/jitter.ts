/**
 * # jitter
 *
 * ```ts
 * function Duration.jitter(duration: number, factor?: number): number
 * ```
 *
 * Returns `duration` made longer by a random part of it, up to `factor` of it, which is `0.2` by
 * default. Never shorter, so what something asked to wait for is waited for.
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
