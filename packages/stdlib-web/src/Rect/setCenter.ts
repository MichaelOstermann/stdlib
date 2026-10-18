import type { Rect } from "."
import { centerX } from "./centerX"
import { centerY } from "./centerY"
import { merge } from "./merge"

/**
 * # setCenter
 *
 * ```ts
 * function Rect.setCenter(rect: Rect, x: number, y: number): Rect
 * ```
 *
 * Moves the rect so its center is at `x, y`. The size stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.setCenter({ left: 10, top: 20, width: 100, height: 50 }, 75, 60);
 * // { left: 25, top: 35, width: 100, height: 50 }
 * ```
 */
export function setCenter(rect: Rect, x: number, y: number): Rect {
    return merge(rect, {
        left: x === centerX(rect) ? rect.left : x - (rect.width / 2),
        top: y === centerY(rect) ? rect.top : y - (rect.height / 2),
    })
}
