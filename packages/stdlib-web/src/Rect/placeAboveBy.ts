import type { Rect } from "."
import { moveBottomTo } from "./moveBottomTo"

/**
 * # placeAboveBy
 *
 * ```ts
 * function Rect.placeAboveBy(target: Rect, source: Rect, distance: number): Rect
 * ```
 *
 * Positions a `target` rectangle above a `source` rectangle with a specified distance between them. The `target` rectangle is moved so its bottom edge is positioned above the `source` rectangle's top edge by the given distance.
 *
 * ## Example
 *
 * ```ts
 * Rect.placeAboveBy(
 *     { left: 50, top: 100, width: 40, height: 30 },
 *     { left: 0, top: 60, width: 100, height: 20 },
 *     10,
 * );
 * // { left: 50, top: 20, width: 40, height: 30 }
 * ```
 *
 */
export function placeAboveBy(target: Rect, source: Rect, distance: number): Rect {
    return moveBottomTo(target, source.top - distance)
}
