import type { Rect } from "."
import { bottom } from "./bottom"
import { right } from "./right"

/**
 * # intersects
 *
 * ```ts
 * function Rect.intersects(a: Rect, b: Rect): boolean
 * ```
 *
 * Whether `a` and `b` overlap. Rects that only share an edge do not.
 *
 * ## Example
 *
 * ```ts
 * Rect.intersects(
 *     { left: 0, top: 0, width: 50, height: 50 },
 *     { left: 25, top: 25, width: 50, height: 50 },
 * );
 * // true
 * ```
 */
export function intersects(a: Rect, b: Rect): boolean {
    return !(
        a.left >= right(b)
        || right(a) <= b.left
        || a.top >= bottom(b)
        || bottom(a) <= b.top
    )
}
