import type { Rect } from "."
import { moveTopTo } from "./moveTopTo"

/**
 * # placeBelowBy
 *
 * ```ts
 * function Rect.placeBelowBy(target: Rect, source: Rect, distance: number): Rect
 * ```
 *
 * Positions a `target` rectangle below a `source` rectangle with a specified distance between them. The `target` rectangle is moved so its top edge is positioned below the `source` rectangle's bottom edge by the given distance.
 *
 * ## Example
 *
 * ```ts
 * Rect.placeBelowBy(
 *     { left: 50, top: 10, width: 40, height: 30 },
 *     { left: 0, top: 20, width: 100, height: 20 },
 *     10,
 * );
 * // { left: 50, top: 50, width: 40, height: 30 }
 * ```
 *
 */
export function placeBelowBy(target: Rect, source: Rect, distance: number): Rect {
    return moveTopTo(target, source.top + source.height + distance)
}
