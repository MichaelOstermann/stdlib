import type { Rect } from "."
import { clamp } from "./internals/clamp"
import { merge } from "./merge"

/**
 * # dropRightPx
 *
 * ```ts
 * function Rect.dropRightPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes a specified number of pixels from the rectangle's width at the right edge.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropRightPx({ left: 10, top: 20, width: 100, height: 80 }, 25);
 * // { left: 10, top: 20, width: 75, height: 80 }
 * ```
 *
 */
export function dropRightPx(rect: Rect, amount: number): Rect {
    return merge(rect, { width: rect.width - clamp(amount, 0, rect.width) })
}
