import type { Rect } from "."
import { takeLeftPx } from "./takeLeftPx"

/**
 * # takeLeftPct
 *
 * ```ts
 * function Rect.takeLeftPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Keeps the left `amount` of the width, as a fraction from `0` to `1`.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeLeftPct({ left: 10, top: 20, width: 100, height: 50 }, 0.3);
 * // { left: 10, top: 20, width: 30, height: 50 }
 * ```
 */
export function takeLeftPct(rect: Rect, amount: number): Rect {
    return takeLeftPx(rect, rect.width * amount)
}
