import type { Rect } from "."
import { centerY } from "./centerY"
import { merge } from "./merge"

/**
 * # scaleY
 *
 * ```ts
 * function Rect.scaleY(rect: Rect, factor: number): Rect
 * ```
 *
 * Multiplies the height by `factor`, around the vertical center. A negative `factor` counts as `0`.
 *
 * ## Example
 *
 * ```ts
 * Rect.scaleY({ left: 10, top: 20, width: 100, height: 50 }, 1.5);
 * // { left: 10, top: 7.5, width: 100, height: 75 }
 * ```
 */
export function scaleY(rect: Rect, factor: number): Rect {
    const height = rect.height * Math.max(factor, 0)
    return merge(rect, {
        height,
        top: height === rect.height ? rect.top : centerY(rect) - height / 2,
    })
}
