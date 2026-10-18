import type { Rect } from "."
import { merge } from "./merge"

/**
 * # shrink
 *
 * ```ts
 * function Rect.shrink(rect: Rect, amount: number): Rect
 * ```
 *
 * Shrinks a rectangle by moving all edges inward by the specified amount.
 *
 * ## Example
 *
 * ```ts
 * Rect.shrink({ left: 10, top: 20, width: 100, height: 60 }, 15);
 * // { left: 25, top: 35, width: 70, height: 30 }
 * ```
 *
 */
export function shrink(rect: Rect, amount: number): Rect {
    const dw = Math.clamp(amount, 0, rect.width / 2)
    const dh = Math.clamp(amount, 0, rect.height / 2)
    return merge(rect, {
        height: rect.height - (dh * 2),
        left: rect.left + dw,
        top: rect.top + dh,
        width: rect.width - (dw * 2),
    })
}
