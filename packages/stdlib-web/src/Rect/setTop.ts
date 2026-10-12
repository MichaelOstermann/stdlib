import type { Rect } from "."
import { merge } from "./merge"

/**
 * # setTop
 *
 * ```ts
 * function Rect.setTop(rect: Rect, top: number): Rect
 * ```
 *
 * Sets the top edge of a rectangle to a specific y-coordinate. The rectangle's height is adjusted to maintain the bottom edge position while moving the top edge to the new position.
 *
 * ## Example
 *
 * ```ts
 * Rect.setTop({ left: 10, top: 20, width: 100, height: 50 }, 30);
 * // { left: 10, top: 30, width: 100, height: 40 }
 * ```
 *
 */
export function setTop(rect: Rect, top: number): Rect {
    if (top === rect.top) return rect
    const bottom = rect.top + rect.height
    top = Math.min(top, bottom)
    return merge(rect, {
        height: bottom - top,
        top,
    })
}
