import type { Rect } from "."
import { dropBottomPx } from "./dropBottomPx"

/**
 * # dropBottomPct
 *
 * ```ts
 * function Rect.dropBottomPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes `amount` of the height from the bottom, as a fraction from `0` to `1`. The top edge stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropBottomPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 20, width: 100, height: 60 }
 * ```
 */
export function dropBottomPct(rect: Rect, amount: number): Rect {
    return dropBottomPx(rect, rect.height * amount)
}
