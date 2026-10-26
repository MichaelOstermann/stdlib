import { clamp } from "../Math/clamp"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # lighten
 *
 * ```ts
 * Color.lighten(color, amount)
 * ```
 *
 * Returns `color` with `amount` added to its lightness, up to 1, as an `oklch()` color. A `color`
 * that does not parse is returned as it is.
 *
 * ## Example
 *
 * ```ts
 * Color.lighten("oklch(0.5 0.1 262)", 0.2); // "oklch(0.7 0.1 262)"
 * Color.lighten("#1f2029", 0.2); // "oklch(0.4465 0.0171 280.08)"
 * ```
 */
export function lighten(color: string, amount: number): string {
    const parsed = parse(color)
    return parsed ? oklch({ ...parsed, l: clamp(parsed.l + amount, 0, 1) }) : color
}
