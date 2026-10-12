import type { Rect } from "."
import { placeLeftOfBy } from "./placeLeftOfBy"

/**
 * # snapLeftOf
 *
 * ```ts
 * function Rect.snapLeftOf(target: Rect, source: Rect): Rect
 * ```
 *
 * Positions a `target` rectangle directly to the left of a `source` rectangle with no gap between them. The `target` rectangle's right edge is aligned with the `source` rectangle's left edge.
 *
 * ## Example
 *
 * ```ts
 * Rect.snapLeftOf(
 *     { left: 100, top: 50, width: 40, height: 30 },
 *     { left: 60, top: 20, width: 100, height: 20 },
 * );
 * // { left: 20, top: 50, width: 40, height: 30 }
 * ```
 *
 */
export function snapLeftOf(target: Rect, source: Rect): Rect {
    return placeLeftOfBy(target, source, 0)
}
