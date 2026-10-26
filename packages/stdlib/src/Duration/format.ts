import { DAY } from "./DAY"
import { HOUR } from "./HOUR"
import { MINUTE } from "./MINUTE"
import { SECOND } from "./SECOND"

let formatter: Intl.DurationFormat | undefined

/**
 * # format
 *
 * ```ts
 * function Duration.format(
 *     duration: number,
 *     locales?: Intl.LocalesArgument,
 *     options?: Intl.DurationFormatOptions,
 * ): string
 * ```
 *
 * Writes the milliseconds of `duration` out as days, hours, minutes, seconds and milliseconds,
 * leaving out the ones that are zero.
 *
 * `locales` and `options` are the ones of `Intl.DurationFormat`, which does the writing. The
 * `style` is `"narrow"` unless another one is asked for.
 *
 * ## Example
 *
 * ```ts
 * Duration.format(90 * Duration.SECOND); // "1m 30s"
 * Duration.format(90 * Duration.SECOND, "en", { style: "short" }); // "1 min, 30 sec"
 * Duration.format(90 * Duration.SECOND, "de", { style: "long" }); // "1 Minute, 30 Sekunden"
 * Duration.format(Duration.HOUR + 5 * Duration.SECOND, "en", { style: "digital" }); // "1:00:05"
 * Duration.format(0); // "0s"
 * ```
 */
export function format(duration: number, locales?: Intl.LocalesArgument, options?: Intl.DurationFormatOptions): string {
    const ms = Math.trunc(duration)
    // Nothing would be written for a duration of nothing.
    if (ms === 0) return new Intl.DurationFormat(locales, { style: "narrow", ...options, secondsDisplay: "always" }).format({ seconds: 0 })

    const parts = {
        days: Math.trunc(ms / DAY),
        hours: Math.trunc(ms % DAY / HOUR),
        milliseconds: ms % SECOND,
        minutes: Math.trunc(ms % HOUR / MINUTE),
        seconds: Math.trunc(ms % MINUTE / SECOND),
    }

    if (locales !== undefined || options) return new Intl.DurationFormat(locales, { style: "narrow", ...options }).format(parts)
    formatter ??= new Intl.DurationFormat(undefined, { style: "narrow" })
    return formatter.format(parts)
}
