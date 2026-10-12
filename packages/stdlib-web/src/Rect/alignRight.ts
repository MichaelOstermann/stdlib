import type { Rect } from "."
import { moveRightTo } from "./moveRightTo"

/**
 * # alignRight
 *
 * ```ts
 * function Rect.alignRight(target: Rect, source: Rect): Rect
 * ```
 *
 * Aligns the right edge of the `target` rectangle to the right edge of the `source` rectangle by moving the `target` rectangle horizontally.
 *
 * ## Example
 *
 * ```ts
 * Rect.alignRight(
 *     { left: 10, top: 10, width: 100, height: 50 },
 *     { left: 50, top: 30, width: 80, height: 40 },
 * );
 * // { left: 30, top: 10, width: 100, height: 50 }
 * ```
 *
 */
export function alignRight(target: Rect, source: Rect): Rect {
    return moveRightTo(target, source.left + source.width)
}
