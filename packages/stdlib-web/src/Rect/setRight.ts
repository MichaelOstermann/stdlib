import type { Rect } from "."
import { setWidth } from "./setWidth"

/**
 * # setRight
 *
 * ```ts
 * function Rect.setRight(rect: Rect, right: number): Rect
 * ```
 *
 * Sets the right edge of a rectangle to a specific x-coordinate. The rectangle's width is adjusted to reach the new right position while keeping the left edge fixed.
 *
 * ## Example
 *
 * ```ts
 * Rect.setRight({ left: 10, top: 20, width: 100, height: 50 }, 130);
 * // { left: 10, top: 20, width: 120, height: 50 }
 * ```
 *
 */
export function setRight(rect: Rect, right: number): Rect {
    if (right === rect.left + rect.width) return rect
    return setWidth(rect, Math.max(rect.left, right) - rect.left)
}
