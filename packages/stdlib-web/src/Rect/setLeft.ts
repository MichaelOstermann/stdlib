import type { Rect } from "."
import { merge } from "./merge"

/**
 * # setLeft
 *
 * ```ts
 * function Rect.setLeft(rect: Rect, left: number): Rect
 * ```
 *
 * Sets the left edge of a rectangle to a specific x-coordinate. The rectangle's width is adjusted to maintain the right edge position while moving the left edge to the new position.
 *
 * ## Example
 *
 * ```ts
 * Rect.setLeft({ left: 20, top: 10, width: 100, height: 50 }, 30);
 * // { left: 30, top: 10, width: 90, height: 50 }
 * ```
 *
 */
export function setLeft(rect: Rect, left: number): Rect {
    if (left === rect.left) return rect
    const right = rect.left + rect.width
    left = Math.min(left, right)
    return merge(rect, {
        left,
        width: right - left,
    })
}
