import type { Rect } from "."
import { merge } from "./merge"

/**
 * # setHeight
 *
 * ```ts
 * function Rect.setHeight(rect: Rect, height: number): Rect
 * ```
 *
 * Sets the height, the top edge stays. A negative height counts as `0`.
 *
 * ## Example
 *
 * ```ts
 * Rect.setHeight({ left: 10, top: 20, width: 100, height: 50 }, 80);
 * // { left: 10, top: 20, width: 100, height: 80 }
 * ```
 */
export function setHeight(rect: Rect, height: number): Rect {
    return merge(rect, { height: Math.max(height, 0) })
}
