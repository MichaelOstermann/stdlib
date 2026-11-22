import { clamp } from "../Math/clamp"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # alpha
 *
 * Returns `color` with its alpha set to `value`, between 0 and 1, as an `oklch()` color. Returns a
 * `color` that does not parse unchanged.
 *
 * ## Example
 *
 * ```ts
 * Color.alpha("#1f2029", 0.5); // "oklch(0.2465 0.0171 280.08 / 0.5)"
 * Color.alpha("oklch(0.5 0.1 262 / 0.5)", 1); // "oklch(0.5 0.1 262)"
 * ```
 */
export function alpha(color: string, value: number): string {
    const parsed = parse(color)
    return parsed ? oklch({ ...parsed, alpha: clamp(value, 0, 1) }) : color
}
