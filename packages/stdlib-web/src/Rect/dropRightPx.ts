import type { Rect } from "."
import { merge } from "./merge"

/**
 * # dropRightPx
 *
 * ```ts
 * function Rect.dropRightPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes `amount` pixels from the right, at most the width. The left edge stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropRightPx({ left: 10, top: 20, width: 100, height: 80 }, 25);
 * // { left: 10, top: 20, width: 75, height: 80 }
 * ```
 */
export function dropRightPx(rect: Rect, amount: number): Rect {
    return merge(rect, { width: rect.width - Math.clamp(amount, 0, rect.width) })
}
