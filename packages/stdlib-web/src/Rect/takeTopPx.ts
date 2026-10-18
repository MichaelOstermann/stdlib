import type { Rect } from "."
import { dropBottomPx } from "./dropBottomPx"

/**
 * # takeTopPx
 *
 * ```ts
 * function Rect.takeTopPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Takes a specified number of pixels from the top of the rectangle. Returns a new rectangle that represents the top portion of the original rectangle, with the height set to the specified pixel amount (clamped to the original height).
 *
 * ## Example
 *
 * ```ts
 * Rect.takeTopPx({ left: 10, top: 20, width: 100, height: 80 }, 20);
 * // { left: 10, top: 20, width: 100, height: 20 }
 * ```
 *
 */
export function takeTopPx(rect: Rect, amount: number): Rect {
    return dropBottomPx(rect, rect.height - amount)
}
