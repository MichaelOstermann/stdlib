import type { Rect } from "."
import { setWidth } from "./setWidth"

/**
 * # setRight
 *
 * ```ts
 * function Rect.setRight(rect: Rect, right: number): Rect
 * ```
 *
 * Moves the right edge to `right`, the left edge stays. A `right` before the left edge gives a
 * width of `0`.
 *
 * ## Example
 *
 * ```ts
 * Rect.setRight({ left: 10, top: 20, width: 100, height: 50 }, 130);
 * // { left: 10, top: 20, width: 120, height: 50 }
 * ```
 */
export function setRight(rect: Rect, right: number): Rect {
    if (right === rect.left + rect.width) return rect
    return setWidth(rect, Math.max(rect.left, right) - rect.left)
}
