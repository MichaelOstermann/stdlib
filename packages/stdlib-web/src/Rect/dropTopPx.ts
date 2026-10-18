import type { Rect } from "."
import { merge } from "./merge"

/**
 * # dropTopPx
 *
 * ```ts
 * function Rect.dropTopPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Removes `amount` pixels from the top, at most the height. The bottom edge stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.dropTopPx({ left: 10, top: 20, width: 100, height: 80 }, 20);
 * // { left: 10, top: 40, width: 100, height: 60 }
 * ```
 */
export function dropTopPx(rect: Rect, amount: number): Rect {
    const dropped = Math.clamp(amount, 0, rect.height)
    return merge(rect, {
        height: rect.height - dropped,
        top: rect.top + dropped,
    })
}
