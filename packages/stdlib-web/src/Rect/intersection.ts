import type { Rect } from "."
import { bottom } from "./bottom"
import { contains } from "./contains"
import { fromEdges } from "./fromEdges"
import { intersects } from "./intersects"
import { isEqual } from "./isEqual"
import { origin } from "./origin"
import { right } from "./right"

/**
 * # intersection
 *
 * ```ts
 * function Rect.intersection(a: Rect, b: Rect): Rect
 * ```
 *
 * The area where `a` and `b` overlap, or `Rect.origin` when they do not.
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
 */
export function intersection(a: Rect, b: Rect): Rect {
    if (isEqual(a, b)) return a
    if (!intersects(a, b)) return origin
    if (contains(b, a)) return a
    if (contains(a, b)) return b
    return fromEdges({
        bottom: Math.min(bottom(a), bottom(b)),
        left: Math.max(a.left, b.left),
        right: Math.min(right(a), right(b)),
        top: Math.max(a.top, b.top),
    })
}
