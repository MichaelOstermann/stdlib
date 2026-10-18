import type { Rect } from "."
import { merge } from "./merge"

/**
 * # translateX
 *
 * ```ts
 * function Rect.translateX(rect: Rect, amount: number): Rect
 * ```
 *
 * Moves the rect right by `amount`, or left for a negative `amount`.
 *
 * ## Example
 *
 * ```ts
 * Rect.translateX({ left: 10, top: 20, width: 100, height: 50 }, 15);
 * // { left: 25, top: 20, width: 100, height: 50 }
 * ```
 */
export function translateX(rect: Rect, amount: number): Rect {
    return merge(rect, { left: rect.left + amount })
}
