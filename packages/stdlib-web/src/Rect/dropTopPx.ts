import type { Rect } from "."
import { merge } from "./merge"

/**
 * # dropTopPx
 *
 * ```ts
 * function Rect.dropTopPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes a specified number of pixels from the rectangle's height at the top edge, moving the top position downward.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropTopPx({ left: 10, top: 20, width: 100, height: 80 }, 20);
 * // { left: 10, top: 40, width: 100, height: 60 }
 * ```
 *
 */
export function dropTopPx(rect: Rect, amount: number): Rect {
    const dh = Math.clamp(amount, 0, rect.height)
    return merge(rect, {
        height: rect.height - dh,
        top: rect.top + dh,
    })
}
