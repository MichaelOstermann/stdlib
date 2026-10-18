import type { Rect } from "."
import { takeBottomPx } from "./takeBottomPx"

/**
 * # takeBottomPct
 *
 * ```ts
 * function Rect.takeBottomPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Takes a percentage of the rectangle from the bottom. Returns a new rectangle that represents the bottom portion of the original rectangle, with the height calculated as a percentage (0-1) of the original height.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeBottomPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 80, width: 100, height: 20 }
 * ```
 *
 */
export function takeBottomPct(rect: Rect, amount: number): Rect {
    return takeBottomPx(rect, rect.height * amount)
}
