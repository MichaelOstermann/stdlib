import type { Rect } from "."
import { dropRightPx } from "./dropRightPx"

/**
 * # dropRightPct
 *
 * ```ts
 * function Rect.dropRightPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes `amount` of the width from the right, as a fraction from `0` to `1`. The left edge stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropRightPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 20, width: 75, height: 80 }
 * ```
 */
export function dropRightPct(rect: Rect, amount: number): Rect {
    return dropRightPx(rect, rect.width * amount)
}
