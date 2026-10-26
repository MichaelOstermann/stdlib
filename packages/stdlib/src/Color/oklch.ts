import type { Color } from "."
import { roundTo } from "../Math/roundTo"

/**
 * # oklch
 *
 * ```ts
 * Color.oklch(color)
 * ```
 *
 * Writes `color`, as `Color.parse` returns it, as a CSS `oklch()` color, with the alpha only when
 * there is some transparency.
 *
 * ## Example
 *
 * ```ts
 * Color.oklch({ l: 0.78, c: 0.2, h: 262, alpha: 1 }); // "oklch(0.78 0.2 262)"
 * const bg = Color.parse("#1f2029")!;
 * Color.oklch({ ...bg, c: bg.c * 2 }); // "oklch(0.2465 0.0342 280.08)"
 * ```
 */
export function oklch(color: Color): string {
    const channels = `${roundTo(color.l, 4)} ${roundTo(color.c, 4)} ${roundTo(color.h, 2)}`
    return color.alpha < 1 ? `oklch(${channels} / ${roundTo(color.alpha, 3)})` : `oklch(${channels})`
}
