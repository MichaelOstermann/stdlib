import type { Rect } from "."
import { moveBottomTo } from "./moveBottomTo"

/**
 * # alignBottom
 *
 * ```ts
 * function Rect.alignBottom(target: Rect, source: Rect): Rect
 * ```
 *
 * Aligns the bottom edge of the `target` rectangle to the bottom edge of the `source` rectangle by moving the `target` rectangle vertically.
 *
 * ## Example
 *
 * ```ts
 * Rect.alignBottom(
 *     { left: 10, top: 10, width: 100, height: 50 },
 *     { left: 50, top: 30, width: 80, height: 40 },
 * );
 * // { left: 10, top: 20, width: 100, height: 50 }
 * ```
 *
 */
export function alignBottom(target: Rect, source: Rect): Rect {
    return moveBottomTo(target, source.top + source.height)
}
