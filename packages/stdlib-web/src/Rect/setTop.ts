import type { Rect } from "."
import { bottom } from "./bottom"
import { merge } from "./merge"

/**
 * # setTop
 *
 * ```ts
 * function Rect.setTop(rect: Rect, top: number): Rect
 * ```
 *
 * Moves the top edge to `top`, the bottom edge stays. A `top` below the bottom edge gives a height of `0`.
 *
 * ## Example
 *
 * ```ts
 * Rect.setTop({ left: 10, top: 20, width: 100, height: 50 }, 30);
 * // { left: 10, top: 30, width: 100, height: 40 }
 * ```
 */
export function setTop(rect: Rect, top: number): Rect {
    if (top === rect.top) return rect
    const bottomEdge = bottom(rect)
    top = Math.min(top, bottomEdge)
    return merge(rect, {
        height: bottomEdge - top,
        top,
    })
}
