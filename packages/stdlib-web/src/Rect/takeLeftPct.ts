import type { Rect } from "."
import { clamp } from "./internals/clamp"
import { merge } from "./merge"

/**
 * # takeLeftPct
 *
 * ```ts
 * function Rect.takeLeftPct(rect: Rect, amount: number): Rect
 * ```
 *
 * Takes a percentage of the rectangle from the left. Returns a new rectangle that represents the left portion of the original rectangle, with the width calculated as a percentage (0-1) of the original width.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeLeftPct({ left: 10, top: 20, width: 100, height: 50 }, 0.3);
 * // { left: 10, top: 20, width: 30, height: 50 }
 * ```
 *
 */
export function takeLeftPct(rect: Rect, amount: number): Rect {
    return merge(rect, { width: rect.width * clamp(amount, 0, 1) })
}
