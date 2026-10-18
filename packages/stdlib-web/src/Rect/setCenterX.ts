import type { Rect } from "."
import { centerX } from "./centerX"
import { merge } from "./merge"

/**
 * # setCenterX
 *
 * ```ts
 * function Rect.setCenterX(rect: Rect, x: number): Rect
 * ```
 *
 * Moves the rect so its horizontal center is at `x`. The size stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.setCenterX({ left: 10, top: 20, width: 100, height: 50 }, 75);
 * // { left: 25, top: 20, width: 100, height: 50 }
 * ```
 */
export function setCenterX(rect: Rect, x: number): Rect {
    if (x === centerX(rect)) return rect
    return merge(rect, { left: x - (rect.width / 2) })
}
