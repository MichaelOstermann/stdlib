import { fromRgb, toRgb } from "../internals/colors"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # over
 *
 * ```ts
 * Color.over(color, background)
 * ```
 *
 * Returns what a browser paints for a transparent `color` on top of `background`, alpha compositing
 * in sRGB, as an `oklch()` color. On an opaque background that is an opaque color that looks the
 * same, which stays the same over anything else. When either side does not parse, `color` is
 * returned as it is.
 *
 * ## Example
 *
 * ```ts
 * Color.over("rgb(255 0 0 / 50%)", "#fff"); // "oklch(0.7436 0.1556 21.53)", #ff7f7f
 * Color.over(hover, bg); // the hover, opaque, to show it over other surfaces
 * ```
 */
export function over(color: string, background: string): string {
    const top = parse(color)
    const bottom = parse(background)
    if (!top || !bottom) return color
    if (top.alpha === 1) return oklch(top)
    if (top.alpha === 0) return oklch(bottom)
    const alpha = top.alpha + bottom.alpha * (1 - top.alpha)
    const a = toRgb(top)
    const b = toRgb(bottom)
    const channel = (i: number): number => (a[i]! * top.alpha + b[i]! * bottom.alpha * (1 - top.alpha)) / alpha
    return oklch(fromRgb(channel(0), channel(1), channel(2), alpha))
}
