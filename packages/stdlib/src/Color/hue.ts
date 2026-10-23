import { normalizeHue } from "../internals/colors"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # hue
 *
 * ```ts
 * Color.hue(color, degrees)
 * ```
 *
 * Returns `color` with its hue set to `degrees`, as an `oklch()` color. To turn the hue by some degrees instead, see `Color.rotate`. A `color` that does not parse is returned as it is.
 *
 * ## Example
 *
 * ```ts
 * Color.hue("oklch(0.5 0.1 262)", 20); // "oklch(0.5 0.1 20)"
 * Color.hue(surface, Color.parse(accent)!.h); // the surface, tinted toward the accent's hue
 * ```
 */
export function hue(color: string, degrees: number): string {
    const parsed = parse(color)
    return parsed ? oklch({ ...parsed, h: normalizeHue(degrees) }) : color
}
