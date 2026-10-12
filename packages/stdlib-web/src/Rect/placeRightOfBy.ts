import type { Rect } from "."
import { moveLeftTo } from "./moveLeftTo"

/**
 * # placeRightOfBy
 *
 * ```ts
 * function Rect.placeRightOfBy(target: Rect, source: Rect, distance: number): Rect
 * ```
 *
 * Positions a `target` rectangle to the right of a `source` rectangle with a specified distance between them. The `target` rectangle is moved so its left edge is positioned to the right of the `source` rectangle's right edge by the given distance.
 *
 * ## Example
 *
 * ```ts
 * Rect.placeRightOfBy(
 *     { left: 10, top: 50, width: 40, height: 30 },
 *     { left: 20, top: 20, width: 100, height: 20 },
 *     10,
 * );
 * // { left: 130, top: 50, width: 40, height: 30 }
 * ```
 *
 */
export function placeRightOfBy(target: Rect, source: Rect, distance: number): Rect {
    return moveLeftTo(target, source.left + source.width + distance)
}
