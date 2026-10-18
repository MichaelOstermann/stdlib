import type { Rect } from "."
import { merge } from "./merge"

/**
 * # shrink
 *
 * ```ts
 * function Rect.shrink(rect: Rect, amount: number): Rect
 * ```
 *
 * Moves every edge inward by `amount`, at most to the center.
 *
 * ## Example
 *
 * ```ts
 * Rect.shrink({ left: 10, top: 20, width: 100, height: 60 }, 15);
 * // { left: 25, top: 35, width: 70, height: 30 }
 * ```
 */
export function shrink(rect: Rect, amount: number): Rect {
    const insetX = Math.clamp(amount, 0, rect.width / 2)
    const insetY = Math.clamp(amount, 0, rect.height / 2)
    return merge(rect, {
        height: rect.height - insetY * 2,
        left: rect.left + insetX,
        top: rect.top + insetY,
        width: rect.width - insetX * 2,
    })
}
