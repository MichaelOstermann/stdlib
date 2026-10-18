import type { Rect } from "."
import { takeTopPx } from "./takeTopPx"

/**
 * # takeTopPct
 *
 * ```ts
 * function Rect.takeTopPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Keeps the top `amount` of the height, as a fraction from `0` to `1`.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeTopPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 20, width: 100, height: 20 }
 * ```
 */
export function takeTopPct(rect: Rect, amount: number): Rect {
    return takeTopPx(rect, rect.height * amount)
}
