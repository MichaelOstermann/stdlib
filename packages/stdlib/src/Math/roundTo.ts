/**
 * # roundTo
 *
 * ```ts
 * Math.roundTo(value, digits)
 * ```
 *
 * Rounds `value` to `digits` decimal places the way `Math.round` rounds to an integer, half up. Negative `digits` round to tens, hundreds, ….
 *
 * ## Example
 *
 * ```ts
 * Math.roundTo(3.14159, 2); // 3.14
 * Math.roundTo(2.5, 0); // 3
 * Math.roundTo(-2.5, 0); // -2
 * Math.roundTo(1234, -2); // 1200
 * ```
 */
export function roundTo(value: number, digits: number): number {
    const factor = 10 ** digits
    return Math.round(value * factor) / factor
}
