import type { Rect } from "."
import { dropRightPx } from "./dropRightPx"

/**
 * # takeLeftPx
 *
 * ```ts
 * function Rect.takeLeftPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Takes a specified number of pixels from the left side of the rectangle, creating a new rectangle that represents only the left portion.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeLeftPx({ left: 10, top: 20, width: 100, height: 80 }, 40);
 * // { left: 10, top: 20, width: 40, height: 80 }
 * ```
 *
 */
export function takeLeftPx(rect: Rect, amount: number): Rect {
    return dropRightPx(rect, rect.width - amount)
}
