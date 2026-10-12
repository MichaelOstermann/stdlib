import type { Rect } from "."
import { moveTopTo } from "./moveTopTo"

/**
 * # alignTop
 *
 * ```ts
 * function Rect.alignTop(target: Rect, source: Rect): Rect
 * ```
 *
 * Aligns the top edge of the `target` rectangle to the top edge of the `source` rectangle by moving the `target` rectangle vertically.
 *
 * ## Example
 *
 * ```ts
 * Rect.alignTop(
 *     { left: 10, top: 10, width: 100, height: 50 },
 *     { left: 50, top: 30, width: 80, height: 40 },
 * );
 * // { left: 10, top: 30, width: 100, height: 50 }
 * ```
 *
 */
export function alignTop(target: Rect, source: Rect): Rect {
    return moveTopTo(target, source.top)
}
