import type { Rect } from "."
import { merge } from "./merge"

/**
 * # setWidth
 *
 * ```ts
 * function Rect.setWidth(rect: Rect, width: number): Rect
 * ```
 *
 * Sets the width of the rectangle to the specified value. Negative values are clamped to 0.
 *
 * ## Example
 *
 * ```ts
 * Rect.setWidth({ left: 10, top: 20, width: 100, height: 50 }, 150);
 * // { left: 10, top: 20, width: 150, height: 50 }
 * ```
 *
 */
export function setWidth(rect: Rect, width: number): Rect {
    return merge(rect, { width: Math.max(width, 0) })
}
