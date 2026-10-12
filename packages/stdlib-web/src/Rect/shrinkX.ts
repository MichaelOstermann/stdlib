import type { Rect } from "."
import { clamp } from "./internals/clamp"
import { merge } from "./merge"

/**
 * # shrinkX
 *
 * ```ts
 * function Rect.shrinkX(rect: Rect, amount: number): Rect
 * ```
 *
 * Shrinks a rectangle horizontally by moving the left and right edges inward by the specified amount.
 *
 * ## Example
 *
 * ```ts
 * Rect.shrinkX({ left: 10, top: 20, width: 100, height: 60 }, 15);
 * // { left: 25, top: 20, width: 70, height: 60 }
 * ```
 *
 */
export function shrinkX(rect: Rect, amount: number): Rect {
    const dw = clamp(amount, 0, rect.width / 2)
    return merge(rect, {
        left: rect.left + dw,
        width: rect.width - (dw * 2),
    })
}
