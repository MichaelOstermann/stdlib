import { normalizeHue } from "../internals/colors"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # rotate
 *
 * ```ts
 * Color.rotate(color, degrees)
 * ```
 *
 * Returns `color` with its hue turned by `degrees`, as an `oklch()` color. To set the hue instead,
 * see `Color.hue`. A `color` that does not parse is returned as it is.
 *
 * ## Example
 *
 * ```ts
 * Color.rotate("oklch(0.5 0.1 262)", 180); // "oklch(0.5 0.1 82)"
 * Color.rotate("oklch(0.5 0.1 20)", -30); // "oklch(0.5 0.1 350)"
 * ```
 */
export function rotate(color: string, degrees: number): string {
    const parsed = parse(color)
    return parsed ? oklch({ ...parsed, h: normalizeHue(parsed.h + degrees) }) : color
}
