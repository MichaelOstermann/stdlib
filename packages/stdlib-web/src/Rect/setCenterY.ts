import type { Rect } from "."
import { merge } from "./merge"

/**
 * # setCenterY
 *
 * ```ts
 * function Rect.setCenterY(rect: Rect, y: number): Rect
 * ```
 *
 * Sets the vertical center position of the rectangle to the specified y-coordinate.
 *
 * ## Example
 *
 * ```ts
 * Rect.setCenterY({ left: 10, top: 20, width: 100, height: 50 }, 60);
 * // { left: 10, top: 35, width: 100, height: 50 }
 * ```
 *
 */
export function setCenterY(rect: Rect, y: number): Rect {
    if (y === rect.top + rect.height / 2) return rect
    return merge(rect, { top: y - (rect.height / 2) })
}
