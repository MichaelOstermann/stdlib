import type { Rect } from "."
import { merge } from "./merge"

/**
 * # dropLeftPx
 *
 * ```ts
 * function Rect.dropLeftPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes `amount` pixels from the left, at most the width. The right edge stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropLeftPx({ left: 10, top: 20, width: 100, height: 80 }, 25);
 * // { left: 35, top: 20, width: 75, height: 80 }
 * ```
 */
export function dropLeftPx(rect: Rect, amount: number): Rect {
    const dropped = Math.clamp(amount, 0, rect.width)
    return merge(rect, {
        left: rect.left + dropped,
        width: rect.width - dropped,
    })
}
