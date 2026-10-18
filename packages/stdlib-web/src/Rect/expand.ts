import type { Rect } from "."
import { merge } from "./merge"

/**
 * # expand
 *
 * ```ts
 * function Rect.expand(rect: Rect, amount: number): Rect
 * ```
 *
 * Moves every edge outward by `amount`. A negative `amount` changes nothing.
 *
 * ## Example
 *
 * ```ts
 * Rect.expand({ left: 10, top: 20, width: 100, height: 50 }, 10);
 * // { left: 0, top: 10, width: 120, height: 70 }
 * ```
 */
export function expand(rect: Rect, amount: number): Rect {
    amount = Math.max(amount, 0)
    return merge(rect, {
        height: rect.height + amount * 2,
        left: rect.left - amount,
        top: rect.top - amount,
        width: rect.width + amount * 2,
    })
}
