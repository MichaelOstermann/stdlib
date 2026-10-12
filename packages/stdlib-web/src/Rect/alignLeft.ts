import type { Rect } from "."
import { moveLeftTo } from "./moveLeftTo"

/**
 * # alignLeft
 *
 * ```ts
 * function Rect.alignLeft(target: Rect, source: Rect): Rect
 * ```
 *
 * Aligns the left edge of the `target` rectangle to the left edge of the `source` rectangle by moving the `target` rectangle horizontally.
 *
 * ## Example
 *
 * ```ts
 * Rect.alignLeft(
 *     { left: 10, top: 10, width: 100, height: 50 },
 *     { left: 50, top: 30, width: 80, height: 40 },
 * );
 * // { left: 50, top: 10, width: 100, height: 50 }
 * ```
 *
 */
export function alignLeft(target: Rect, source: Rect): Rect {
    return moveLeftTo(target, source.left)
}
