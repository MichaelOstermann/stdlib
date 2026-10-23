import { clamp } from "../Math/clamp"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # darken
 *
 * ```ts
 * Color.darken(color, amount)
 * ```
 *
 * Returns `color` with `amount` taken from its lightness, down to 0, as an `oklch()` color. A `color` that does not parse is returned as it is.
 *
 * ## Example
 *
 * ```ts
 * Color.darken("oklch(0.5 0.1 262)", 0.2); // "oklch(0.3 0.1 262)"
 * Color.darken("#fcfcfc", 0.05); // "oklch(0.9411 0 0)"
 * ```
 */
export function darken(color: string, amount: number): string {
    const parsed = parse(color)
    return parsed ? oklch({ ...parsed, l: clamp(parsed.l - amount, 0, 1) }) : color
}
