import type { Rect } from "."
import { merge } from "./merge"

/**
 * # moveBottomTo
 *
 * ```ts
 * function Rect.moveBottomTo(rect: Rect, bottom: number): Rect
 * ```
 *
 * Moves the rectangle so its bottom edge is positioned at the specified y-coordinate.
 *
 * ## Example
 *
 * ```ts
 * Rect.moveBottomTo({ left: 10, top: 20, width: 100, height: 50 }, 100);
 * // { left: 10, top: 50, width: 100, height: 50 }
 * ```
 *
 */
export function moveBottomTo(rect: Rect, bottom: number): Rect {
    if (bottom === rect.top + rect.height) return rect
    return merge(rect, { top: bottom - rect.height })
}
