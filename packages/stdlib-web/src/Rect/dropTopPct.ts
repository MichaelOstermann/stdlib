import type { Rect } from "."
import { dropTopPx } from "./dropTopPx"

/**
 * # dropTopPct
 *
 * ```ts
 * function Rect.dropTopPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes a percentage of the rectangle's height from the top edge, moving the top position downward. The amount should be between 0 and 1.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropTopPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 40, width: 100, height: 60 }
 * ```
 *
 */
export function dropTopPct(rect: Rect, amount: number): Rect {
    return dropTopPx(rect, rect.height * amount)
}
