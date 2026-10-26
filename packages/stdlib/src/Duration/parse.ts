import { DAY } from "./DAY"
import { HOUR } from "./HOUR"
import { MINUTE } from "./MINUTE"
import { SECOND } from "./SECOND"
import { WEEK } from "./WEEK"

const units: Record<string, number> = { d: DAY, h: HOUR, m: MINUTE, ms: 1, s: SECOND, w: WEEK }

/**
 * # parse
 *
 * ```ts
 * function Duration.parse(target: string): number | undefined
 * ```
 *
 * Returns the milliseconds of a duration that is written as a number and a unit: `ms`, `s`, `m`,
 * `h`, `d` or `w`, in any case. Returns `undefined` for everything else.
 *
 * ## Example
 *
 * ```ts
 * Duration.parse("500ms"); // 500
 * Duration.parse("10s"); // 10_000
 * Duration.parse("1.5 h"); // 5_400_000
 * Duration.parse("90D"); // 7_776_000_000
 * Duration.parse("10"); // undefined
 * ```
 */
export function parse(target: string): number | undefined {
    const match = /^(\d+(?:\.\d+)?)\s*(ms|[smhdw])$/i.exec(target.trim())
    if (!match) return undefined
    return Math.round(Number(match[1]) * units[match[2]!.toLowerCase()]!)
}
