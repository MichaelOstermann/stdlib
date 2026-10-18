import type { Rect } from "."
import { takeBottomPx } from "./takeBottomPx"

/**
 * # takeBottomPct
 *
 * ```ts
 * function Rect.takeBottomPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Keeps the bottom `amount` of the height, as a fraction from `0` to `1`.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeBottomPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 80, width: 100, height: 20 }
 * ```
 */
export function takeBottomPct(rect: Rect, amount: number): Rect {
    return takeBottomPx(rect, rect.height * amount)
}
