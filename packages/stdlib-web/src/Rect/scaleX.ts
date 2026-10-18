import type { Rect } from "."
import { centerX } from "./centerX"
import { merge } from "./merge"

/**
 * # scaleX
 *
 * ```ts
 * function Rect.scaleX(rect: Rect, factor: number): Rect
 * ```
 *
 * Multiplies the width by `factor`, around the horizontal center. A negative `factor` counts as `0`.
 *
 * ## Example
 *
 * ```ts
 * Rect.scaleX({ left: 10, top: 20, width: 100, height: 50 }, 1.5);
 * // { left: -15, top: 20, width: 150, height: 50 }
 * ```
 */
export function scaleX(rect: Rect, factor: number): Rect {
    const width = rect.width * Math.max(factor, 0)
    return merge(rect, {
        left: width === rect.width ? rect.left : centerX(rect) - width / 2,
        width,
    })
}
