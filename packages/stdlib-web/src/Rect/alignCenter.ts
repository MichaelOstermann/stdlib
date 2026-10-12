import type { Rect } from "."
import { centerX } from "./centerX"
import { centerY } from "./centerY"
import { setCenter } from "./setCenter"

/**
 * # alignCenter
 *
 * ```ts
 * function Rect.alignCenter(target: Rect, source: Rect): Rect
 * ```
 *
 * Aligns the center point of the `target` rectangle to the center point of the `source` rectangle by moving the `target` rectangle both horizontally and vertically.
 *
 * ## Example
 *
 * ```ts
 * Rect.alignCenter(
 *     { left: 10, top: 10, width: 100, height: 50 },
 *     { left: 50, top: 30, width: 80, height: 40 },
 * );
 * // { left: 40, top: 25, width: 100, height: 50 }
 * ```
 *
 */
export function alignCenter(target: Rect, source: Rect): Rect {
    return setCenter(target, centerX(source), centerY(source))
}
