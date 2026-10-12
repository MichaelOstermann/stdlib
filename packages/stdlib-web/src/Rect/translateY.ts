import type { Rect } from "."
import { merge } from "./merge"

/**
 * # translateY
 *
 * ```ts
 * function Rect.translateY(rect: Rect, amount: number): Rect
 * ```
 *
 * Translates (moves) the rectangle vertically by the specified amount.
 *
 * ## Example
 *
 * ```ts
 * Rect.translateY({ left: 10, top: 20, width: 100, height: 50 }, 15);
 * // { left: 10, top: 35, width: 100, height: 50 }
 * ```
 *
 */
export function translateY(rect: Rect, amount: number): Rect {
    return merge(rect, { top: rect.top + amount })
}
