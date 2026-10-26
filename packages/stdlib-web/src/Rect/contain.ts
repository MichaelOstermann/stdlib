import type { Rect } from "."
import { merge } from "./merge"

/**
 * # contain
 *
 * ```ts
 * function Rect.contain(target: Rect, source: Rect): Rect
 * ```
 *
 * Scales `target` to the largest size that fits inside `source`, keeping its aspect ratio, and
 * centers it in `source`. Like `object-fit: contain`.
 *
 * ## Example
 *
 * ```ts
 * Rect.contain(
 *     { left: 10, top: 20, width: 200, height: 100 },
 *     { left: 0, top: 0, width: 150, height: 120 },
 * );
 * // { left: 0, top: 22.5, width: 150, height: 75 }
 * ```
 */
export function contain(target: Rect, source: Rect): Rect {
    const scale = Math.min(
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
