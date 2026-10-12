import type { Rect } from "."
import { merge } from "./merge"

/**
 * # expandY
 *
 * ```ts
 * function Rect.expandY(rect: Rect, amount: number): Rect
 * ```
 *
 * Expands the rectangle vertically by the specified amount.
 *
 * ## Example
 *
 * ```ts
 * Rect.expandY({ left: 10, top: 20, width: 100, height: 50 }, 10);
 * // { left: 10, top: 10, width: 100, height: 70 }
 * ```
 *
 */
export function expandY(rect: Rect, amount: number): Rect {
    const d = Math.max(amount, 0)
    return merge(rect, {
        height: rect.height + (d * 2),
        top: rect.top - d,
    })
}
