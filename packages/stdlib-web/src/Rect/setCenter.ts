import type { Rect } from "."
import { merge } from "./merge"

/**
 * # setCenter
 *
 * ```ts
 * function Rect.setCenter(rect: Rect, x: number, y: number): Rect
 * ```
 *
 * Sets the center point of the rectangle to the specified coordinates.
 *
 * ## Example
 *
 * ```ts
 * Rect.setCenter({ left: 10, top: 20, width: 100, height: 50 }, 75, 60);
 * // { left: 25, top: 35, width: 100, height: 50 }
 * ```
 *
 */
export function setCenter(rect: Rect, x: number, y: number): Rect {
    return merge(rect, {
        left: x === rect.left + rect.width / 2 ? rect.left : x - (rect.width / 2),
        top: y === rect.top + rect.height / 2 ? rect.top : y - (rect.height / 2),
    })
}
