import type { Rect } from "."
import { merge } from "./merge"

/**
 * # translateX
 *
 * ```ts
 * function Rect.translateX(rect: Rect, amount: number): Rect
 * ```
 *
 * Translates (moves) the rectangle horizontally by the specified amount.
 *
 * ## Example
 *
 * ```ts
 * Rect.translateX({ left: 10, top: 20, width: 100, height: 50 }, 15);
 * // { left: 25, top: 20, width: 100, height: 50 }
 * ```
 *
 */
export function translateX(rect: Rect, amount: number): Rect {
    return merge(rect, { left: rect.left + amount })
}
