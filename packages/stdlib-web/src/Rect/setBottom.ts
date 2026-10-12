import type { Rect } from "."
import { setHeight } from "./setHeight"

/**
 * # setBottom
 *
 * ```ts
 * function Rect.setBottom(rect: Rect, bottom: number): Rect
 * ```
 *
 * Sets the bottom edge of a rectangle to a specific y-coordinate. The rectangle's height is adjusted to reach the new bottom position while keeping the top edge fixed.
 *
 * ## Example
 *
 * ```ts
 * Rect.setBottom({ left: 10, top: 20, width: 100, height: 50 }, 80);
 * // { left: 10, top: 20, width: 100, height: 60 }
 * ```
 *
 */
export function setBottom(rect: Rect, bottom: number): Rect {
    if (bottom === rect.top + rect.height) return rect
    return setHeight(rect, (Math.max(rect.top, bottom)) - rect.top)
}
