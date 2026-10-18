import type { Rect } from "."
import { merge } from "./merge"
import { right } from "./right"

/**
 * # setLeft
 *
 * ```ts
 * function Rect.setLeft(rect: Rect, left: number): Rect
 * ```
 *
 * Moves the left edge to `left`, the right edge stays. A `left` past the right edge gives a width of `0`.
 *
 * ## Example
 *
 * ```ts
 * Rect.setLeft({ left: 20, top: 10, width: 100, height: 50 }, 30);
 * // { left: 30, top: 10, width: 90, height: 50 }
 * ```
 */
export function setLeft(rect: Rect, left: number): Rect {
    if (left === rect.left) return rect
    const rightEdge = right(rect)
    left = Math.min(left, rightEdge)
    return merge(rect, {
        left,
        width: rightEdge - left,
    })
}
