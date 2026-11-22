import { normalizeHue } from "../internals/colors"
import { oklch } from "./oklch"
import { parse } from "./parse"

/**
 * # mix
 *
 * Mixes `from` and `to` in OKLCH and returns an `oklch()` color. `ratio` 0 gives `from`, 1 gives
 * `to`. The hue takes the shorter way around. When one side is gray, the hue of the other side is
 * used. When either side does not parse, returns `from` unchanged.
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
