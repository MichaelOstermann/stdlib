import type { Rect } from "."
import { merge } from "./merge"

/**
 * # dropBottomPx
 *
 * ```ts
 * function Rect.dropBottomPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes a specified number of pixels from the rectangle's height at the bottom edge.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropBottomPx({ left: 10, top: 20, width: 100, height: 80 }, 20);
 * // { left: 10, top: 20, width: 100, height: 60 }
 * ```
 *
 */
export function dropBottomPx(rect: Rect, amount: number): Rect {
    return merge(rect, { height: rect.height - Math.clamp(amount, 0, rect.height) })
}
