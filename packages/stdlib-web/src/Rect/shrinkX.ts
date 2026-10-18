import type { Rect } from "."
import { merge } from "./merge"

/**
 * # shrinkX
 *
 * ```ts
 * function Rect.shrinkX(rect: Rect, amount: number): Rect
 * ```
 *
 * Moves the left and right edges inward by `amount`, at most to the center.
 *
 * ## Example
 *
 * ```ts
 * Rect.shrinkX({ left: 10, top: 20, width: 100, height: 60 }, 15);
 * // { left: 25, top: 20, width: 70, height: 60 }
 * ```
 */
export function shrinkX(rect: Rect, amount: number): Rect {
    const insetX = Math.clamp(amount, 0, rect.width / 2)
    return merge(rect, {
        left: rect.left + insetX,
        width: rect.width - insetX * 2,
    })
}
