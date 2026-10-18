import type { Rect } from "."
import { merge } from "./merge"

/**
 * # shrinkY
 *
 * ```ts
 * function Rect.shrinkY(rect: Rect, amount: number): Rect
 * ```
 *
 * Moves the top and bottom edges inward by `amount`, at most to the center.
 *
 * ## Example
 *
 * ```ts
 * Rect.shrinkY({ left: 10, top: 20, width: 100, height: 60 }, 10);
 * // { left: 10, top: 30, width: 100, height: 40 }
 * ```
 */
export function shrinkY(rect: Rect, amount: number): Rect {
    const insetY = Math.clamp(amount, 0, rect.height / 2)
    return merge(rect, {
        height: rect.height - insetY * 2,
        top: rect.top + insetY,
    })
}
