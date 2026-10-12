import type { Rect } from "."
import { contains } from "./contains"
import { fromEdges } from "./fromEdges"

/**
 * # union
 *
 * ```ts
 * function Rect.union(a: Rect, b: Rect): Rect
 * ```
 *
 * Calculates the union of two rectangles, returning the smallest rectangle that contains both rectangles.
 *
 * ## Example
 *
 * ```ts
 * Rect.union(
 *     { left: 0, top: 0, width: 50, height: 50 },
 *     { left: 25, top: 25, width: 50, height: 50 },
 * );
 * // { left: 0, top: 0, width: 75, height: 75 }
 * ```
 *
 */
export function union(a: Rect, b: Rect): Rect {
    if (contains(a, b)) return a
    if (contains(b, a)) return b
    return fromEdges({
        bottom: Math.max(a.top + a.height, b.top + b.height),
        left: Math.min(a.left, b.left),
        right: Math.max(a.left + a.width, b.left + b.width),
        top: Math.min(a.top, b.top),
    })
}
