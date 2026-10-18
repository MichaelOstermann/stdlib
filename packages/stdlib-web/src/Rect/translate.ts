import type { Rect } from "."
import { merge } from "./merge"

/**
 * # translate
 *
 * ```ts
 * function Rect.translate(rect: Rect, amount: number): Rect
 * ```
 *
 * Moves the rect right and down by `amount`.
 *
 * ## Example
 *
 * ```ts
 * Rect.translate({ left: 10, top: 20, width: 100, height: 50 }, 15);
 * // { left: 25, top: 35, width: 100, height: 50 }
 * ```
 */
export function translate(rect: Rect, amount: number): Rect {
    return merge(rect, {
        left: rect.left + amount,
        top: rect.top + amount,
    })
}
