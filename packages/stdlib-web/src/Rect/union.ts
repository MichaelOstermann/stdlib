import type { Rect } from "."
import { bottom } from "./bottom"
import { contains } from "./contains"
import { fromEdges } from "./fromEdges"
import { right } from "./right"

/**
 * # union
 *
 * ```ts
 * function Rect.union(a: Rect, b: Rect): Rect
 * ```
 *
 * The smallest rect that contains both `a` and `b`.
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
 */
export function union(a: Rect, b: Rect): Rect {
    if (contains(a, b)) return a
    if (contains(b, a)) return b
    return fromEdges({
        bottom: Math.max(bottom(a), bottom(b)),
        left: Math.min(a.left, b.left),
        right: Math.max(right(a), right(b)),
        top: Math.min(a.top, b.top),
    })
}
