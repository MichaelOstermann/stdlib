import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # desaturate
 *
 * ```ts
 * Color.desaturate(color, amount)
 * ```
 *
 * Returns `color` with `amount` taken from its chroma, down to gray, as an `oklch()` color. A `color` that does not parse is returned as it is.
 *
 * ## Example
 *
 * ```ts
 * Color.desaturate("oklch(0.5 0.1 262)", 0.05); // "oklch(0.5 0.05 262)"
 * Color.desaturate("oklch(0.5 0.1 262)", 1); // "oklch(0.5 0 262)"
 * ```
 */
export function desaturate(color: string, amount: number): string {
    const parsed = parse(color)
    return parsed ? oklch({ ...parsed, c: Math.max(parsed.c - amount, 0) }) : color
}
