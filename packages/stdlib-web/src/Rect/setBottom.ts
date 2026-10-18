import type { Rect } from "."
import { setHeight } from "./setHeight"

/**
 * # setBottom
 *
 * ```ts
 * function Rect.setBottom(rect: Rect, bottom: number): Rect
 * ```
 *
 * Moves the bottom edge to `bottom`, the top edge stays. A `bottom` above the top edge gives a height of `0`.
 *
 * ## Example
 *
 * ```ts
 * Rect.setBottom({ left: 10, top: 20, width: 100, height: 50 }, 80);
 * // { left: 10, top: 20, width: 100, height: 60 }
 * ```
 */
export function setBottom(rect: Rect, bottom: number): Rect {
    if (bottom === rect.top + rect.height) return rect
    return setHeight(rect, Math.max(rect.top, bottom) - rect.top)
}
