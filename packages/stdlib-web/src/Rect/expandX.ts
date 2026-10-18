import type { Rect } from "."
import { merge } from "./merge"

/**
 * # expandX
 *
 * ```ts
 * function Rect.expandX(rect: Rect, amount: number): Rect
 * ```
 *
 * Moves the left and right edges outward by `amount`. A negative `amount` changes nothing.
 *
 * ## Example
 *
 * ```ts
 * Rect.expandX({ left: 10, top: 20, width: 100, height: 50 }, 10);
 * // { left: 0, top: 20, width: 120, height: 50 }
 * ```
 */
export function expandX(rect: Rect, amount: number): Rect {
    amount = Math.max(amount, 0)
    return merge(rect, {
        left: rect.left - amount,
        width: rect.width + amount * 2,
    })
}
