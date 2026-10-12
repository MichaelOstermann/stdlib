import type { Rect } from "."
import { merge } from "./merge"

/**
 * # clamp
 *
 * ```ts
 * function Rect.clamp(target: Rect, source: Rect): Rect
 * ```
 *
 * Constrains the `target` rectangle to fit within the boundaries of the `source` rectangle, adjusting position and size as needed.
 *
 * ## Example
 *
 * ```ts
 * Rect.clamp(
 *     { left: 50, top: 60, width: 200, height: 100 },
 *     { left: 0, top: 0, width: 150, height: 120 },
 * );
 * // { left: 0, top: 20, width: 150, height: 100 }
 * ```
 *
 */
export function clamp(target: Rect, source: Rect): Rect {
    const width = Math.min(target.width, source.width)
    const height = Math.min(target.height, source.height)
    const left = Math.max(source.left, Math.min(target.left, source.left + source.width - width))
    const top = Math.max(source.top, Math.min(target.top, source.top + source.height - height))
    return merge(target, {
        height,
        left,
        top,
        width,
    })
}
