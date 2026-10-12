import type { Rect } from "."
import { centerX } from "./centerX"
import { centerY } from "./centerY"
import { merge } from "./merge"

/**
 * # scale
 *
 * ```ts
 * function Rect.scale(rect: Rect, factor: number): Rect
 * ```
 *
 * Scales the rectangle by the specified factor in both dimensions while keeping it centered at the same position.
 *
 * ## Example
 *
 * ```ts
 * Rect.scale({ left: 10, top: 20, width: 100, height: 50 }, 1.5);
 * // { left: -15, top: 7.5, width: 150, height: 75 }
 * ```
 *
 */
export function scale(rect: Rect, factor: number): Rect {
    factor = Math.max(factor, 0)
    const width = rect.width * factor
    const height = rect.height * factor
    return merge(rect, {
        height,
        left: width === rect.width ? rect.left : centerX(rect) - width / 2,
        top: height === rect.height ? rect.top : centerY(rect) - height / 2,
        width,
    })
}
