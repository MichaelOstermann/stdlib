import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # saturate
 *
 * Returns `color` with `amount` added to its chroma, as an `oklch()` color. Returns a `color` that
 * does not parse unchanged.
 *
 * ## Example
 *
 * ```ts
 * Color.saturate("oklch(0.5 0.1 262)", 0.05); // "oklch(0.5 0.15 262)"
 * ```
 */
export function saturate(color: string, amount: number): string {
    const parsed = parse(color)
    return parsed ? oklch({ ...parsed, c: Math.max(parsed.c + amount, 0) }) : color
}
