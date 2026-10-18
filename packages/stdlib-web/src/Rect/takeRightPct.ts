import type { Rect } from "."
import { merge } from "./merge"

/**
 * # takeRightPct
 *
 * ```ts
 * function Rect.takeRightPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Takes a percentage of the rectangle from the right. Returns a new rectangle that represents the right portion of the original rectangle, with the width calculated as a percentage (0-1) of the original width.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeRightPct({ left: 10, top: 20, width: 100, height: 50 }, 0.4);
 * // { left: 70, top: 20, width: 40, height: 50 }
 * ```
 *
 */
export function takeRightPct(rect: Rect, amount: number): Rect {
    const width = rect.width * Math.clamp(amount, 0, 1)
    if (width === rect.width) return rect
    return merge(rect, {
        left: rect.left + rect.width - width,
        width,
    })
}
