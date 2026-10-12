import type { Rect } from "."
import { clamp } from "./internals/clamp"
import { merge } from "./merge"

/**
 * # takeBottomPx
 *
 * ```ts
 * function Rect.takeBottomPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Takes a specified number of pixels from the bottom of the rectangle, creating a new rectangle that represents only the bottom portion.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeBottomPx({ left: 10, top: 20, width: 100, height: 80 }, 30);
 * // { left: 10, top: 70, width: 100, height: 30 }
 * ```
 *
 */
export function takeBottomPx(rect: Rect, amount: number): Rect {
    const height = clamp(amount, 0, rect.height)
    if (height === rect.height) return rect
    return merge(rect, {
        height,
        top: rect.top + rect.height - height,
    })
}
