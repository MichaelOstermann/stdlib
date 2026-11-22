/**
 * # clamp
 *
 * Constrains `value` to be between `min` and `max` (inclusive).
 *
 * ## Example
 *
 * ```ts
 * Math.clamp(10, 0, 5); // 5
 * Math.clamp(-2, 0, 5); // 0
 * Math.clamp(3, 0, 5); // 3
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}
