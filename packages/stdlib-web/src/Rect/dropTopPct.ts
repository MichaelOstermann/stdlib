import type { Rect } from "."
import { dropTopPx } from "./dropTopPx"

/**
 * # dropTopPct
 *
 * Removes `amount` of the height from the top, as a fraction from `0` to `1`. The bottom edge
 * stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropTopPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 40, width: 100, height: 60 }
 * ```
 */
export function dropTopPct(rect: Rect, amount: number): Rect {
    return dropTopPx(rect, rect.height * amount)
}
