import type { Rect } from "."
import { contains } from "./contains"
import { fromEdges } from "./fromEdges"
import { intersects } from "./intersects"
import { isEqual } from "./isEqual"
import { origin } from "./origin"

/**
 * # intersection
 *
 * ```ts
 * function Rect.intersection(a: Rect, b: Rect): Rect
 * ```
 *
 * Calculates the intersection rectangle of two rectangles. Returns the origin rectangle if they don't intersect.
 *
 * ## Example
 *
 * ```ts
 * Rect.intersection(
 *     { left: 0, top: 0, width: 50, height: 50 },
 *     { left: 25, top: 25, width: 50, height: 50 },
 * );
 * // { left: 25, top: 25, width: 25, height: 25 }
 * ```
 *
 */
export function intersection(a: Rect, b: Rect): Rect {
    if (isEqual(a, b)) return a
    if (!intersects(a, b)) return origin
    if (contains(b, a)) return a
    if (contains(a, b)) return b
    return fromEdges({
        bottom: Math.min(a.top + a.height, b.top + b.height),
        left: Math.max(a.left, b.left),
        right: Math.min(a.left + a.width, b.left + b.width),
        top: Math.max(a.top, b.top),
    })
}
