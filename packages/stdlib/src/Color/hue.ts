import { normalizeHue } from "./internals"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # hue
 *
 * Returns `color` with its hue set to `degrees`, as an `oklch()` color. To turn the hue by some
 * degrees instead, see `Color.rotate`. Returns a `color` that does not parse unchanged.
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
