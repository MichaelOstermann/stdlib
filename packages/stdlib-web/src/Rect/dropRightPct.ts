import type { Rect } from "."
import { clamp } from "./internals/clamp"
import { merge } from "./merge"

/**
 * # dropRightPct
 *
 * ```ts
 * function Rect.dropRightPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes a percentage of the rectangle's width from the right edge. The amount should be between 0 and 1.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropRightPct({ left: 10, top: 20, width: 100, height: 80 }, 0.25);
 * // { left: 10, top: 20, width: 75, height: 80 }
 * ```
 *
 */
export function dropRightPct(rect: Rect, amount: number): Rect {
    return merge(rect, { width: rect.width - (rect.width * clamp(amount, 0, 1)) })
}
