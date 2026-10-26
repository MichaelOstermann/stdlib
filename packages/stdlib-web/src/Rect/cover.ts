import type { Rect } from "."
import { merge } from "./merge"

/**
 * # cover
 *
 * ```ts
 * function Rect.cover(target: Rect, source: Rect): Rect
 * ```
 *
 * Scales `target` to the smallest size that covers `source`, keeping its aspect ratio, and centers
 * it on `source`. Like `object-fit: cover`.
 *
 * ## Example
 *
 * ```ts
 * Rect.cover(
 *     { left: 10, top: 20, width: 100, height: 50 },
 *     { left: 0, top: 0, width: 150, height: 120 },
 * );
 * // { left: -45, top: 0, width: 240, height: 120 }
 * ```
 */
export function cover(target: Rect, source: Rect): Rect {
    const scale = Math.max(
        source.width / target.width,
        source.height / target.height,
    )

    const width = target.width * scale
    const height = target.height * scale

    return merge(target, {
        height,
        left: source.left + (source.width - width) / 2,
        top: source.top + (source.height - height) / 2,
        width,
    })
}
