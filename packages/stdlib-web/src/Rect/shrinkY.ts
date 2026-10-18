import type { Rect } from "."
import { merge } from "./merge"

/**
 * # shrinkY
 *
 * ```ts
 * function Rect.shrinkY(rect: Rect, amount: number): Rect
 * ```
 *
 * Shrinks a rectangle vertically by moving the top and bottom edges inward by the specified amount.
 *
 * ## Example
 *
 * ```ts
 * Rect.shrinkY({ left: 10, top: 20, width: 100, height: 60 }, 10);
 * // { left: 10, top: 30, width: 100, height: 40 }
 * ```
 *
 */
export function shrinkY(rect: Rect, amount: number): Rect {
    const dh = Math.clamp(amount, 0, rect.height / 2)
    return merge(rect, {
        height: rect.height - (dh * 2),
        top: rect.top + dh,
    })
}
