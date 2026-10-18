import type { Rect } from "."
import { merge } from "./merge"

/**
 * # moveRightTo
 *
 * ```ts
 * function Rect.moveRightTo(rect: Rect, right: number): Rect
 * ```
 *
 * Moves the rect so its right edge is at `right`. The size stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.moveRightTo({ left: 10, top: 20, width: 100, height: 50 }, 150);
 * // { left: 50, top: 20, width: 100, height: 50 }
 * ```
 */
export function moveRightTo(rect: Rect, right: number): Rect {
    if (right === rect.left + rect.width) return rect
    return merge(rect, { left: right - rect.width })
}
