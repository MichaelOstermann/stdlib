import type { Rect } from "."
import { clamp } from "./internals/clamp"
import { merge } from "./merge"

/**
 * # takeTopPct
 *
 * ```ts
 * function Rect.takeTopPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Takes a percentage of the rectangle from the top. Returns a new rectangle that represents the top portion of the original rectangle, with the height calculated as a percentage (0-1) of the original height.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeTopPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 20, width: 100, height: 20 }
 * ```
 *
 */
export function takeTopPct(rect: Rect, amount: number): Rect {
    return merge(rect, { height: rect.height * clamp(amount, 0, 1) })
}
