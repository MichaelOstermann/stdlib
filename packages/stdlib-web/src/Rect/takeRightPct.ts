import type { Rect } from "."
import { takeRightPx } from "./takeRightPx"

/**
 * # takeRightPct
 *
 * ```ts
 * function Rect.takeRightPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Keeps the right `amount` of the width, as a fraction from `0` to `1`.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeRightPct({ left: 10, top: 20, width: 100, height: 50 }, 0.4);
 * // { left: 70, top: 20, width: 40, height: 50 }
 * ```
 */
export function takeRightPct(rect: Rect, amount: number): Rect {
    return takeRightPx(rect, rect.width * amount)
}
