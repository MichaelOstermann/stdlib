import { normalizeHue } from "../internals/colors"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # mix
 *
 * ```ts
 * Color.mix(from, to, ratio)
 * ```
 *
 * Returns the color `ratio` of the way from `from` to `to`, mixed in OKLCH, as an `oklch()` color: 0 is `from`, 1 is `to`. The hue takes the shorter way around, and where one side is gray it takes the hue of the other. When either side does not parse, `from` is returned as it is.
 *
 * ## Example
 *
 * ```ts
 * Color.mix(bg, fg, 0.8); // a secondary text color, closer to fg
 * Color.mix("#1f2029", "oklch(78% 0.2 262)", 0.2); // "oklch(0.3532 0.0537 276.46)", tinted blue
 * ```
 */
export function mix(from: string, to: string, ratio: number): string {
    const a = parse(from)
    const b = parse(to)
    if (!a || !b) return from
    let h = a.c === 0 ? b.h : a.h
    if (a.c !== 0 && b.c !== 0) h = normalizeHue(a.h + ((b.h - a.h + 540) % 360 - 180) * ratio)
    return oklch({
        alpha: a.alpha + (b.alpha - a.alpha) * ratio,
        c: a.c + (b.c - a.c) * ratio,
        h,
        l: a.l + (b.l - a.l) * ratio,
    })
}
