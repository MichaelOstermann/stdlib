import type { Rect } from "."
import { merge } from "./merge"

/**
 * # setCenterX
 *
 * ```ts
 * function Rect.setCenterX(rect: Rect, x: number): Rect
 * ```
 *
 * Sets the horizontal center position of the rectangle to the specified x-coordinate.
 *
 * ## Example
 *
 * ```ts
 * Rect.setCenterX({ left: 10, top: 20, width: 100, height: 50 }, 75);
 * // { left: 25, top: 20, width: 100, height: 50 }
 * ```
 *
 */
export function setCenterX(rect: Rect, x: number): Rect {
    if (x === rect.left + rect.width / 2) return rect
    return merge(rect, { left: x - (rect.width / 2) })
}
