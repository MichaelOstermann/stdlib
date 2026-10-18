import type { Rect } from "."
import { dropLeftPx } from "./dropLeftPx"

/**
 * # dropLeftPct
 *
 * ```ts
 * function Rect.dropLeftPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes `amount` of the width from the left, as a fraction from `0` to `1`. The right edge stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropLeftPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 35, top: 20, width: 75, height: 80 }
 * ```
 */
export function dropLeftPct(rect: Rect, amount: number): Rect {
    return dropLeftPx(rect, rect.width * amount)
}
