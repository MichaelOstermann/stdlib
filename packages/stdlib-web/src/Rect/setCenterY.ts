import type { Rect } from "."
import { centerY } from "./centerY"
import { merge } from "./merge"

/**
 * # setCenterY
 *
 * ```ts
 * function Rect.setCenterY(rect: Rect, y: number): Rect
 * ```
 *
 * Moves the rect so its vertical center is at `y`. The size stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.setCenterY({ left: 10, top: 20, width: 100, height: 50 }, 60);
 * // { left: 10, top: 35, width: 100, height: 50 }
 * ```
 */
export function setCenterY(rect: Rect, y: number): Rect {
    if (y === centerY(rect)) return rect
    return merge(rect, { top: y - (rect.height / 2) })
}
