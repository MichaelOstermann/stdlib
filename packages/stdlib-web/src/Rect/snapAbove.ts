import type { Rect } from "."
import { placeAboveBy } from "./placeAboveBy"

/**
 * # snapAbove
 *
 * ```ts
 * function Rect.snapAbove(target: Rect, source: Rect): Rect
 * ```
 *
 * Positions a `target` rectangle directly above a `source` rectangle with no gap between them. The `target` rectangle's bottom edge is aligned with the `source` rectangle's top edge.
 *
 * ## Example
 *
 * ```ts
 * Rect.snapAbove(
 *     { left: 50, top: 100, width: 40, height: 30 },
 *     { left: 0, top: 60, width: 100, height: 20 },
 * );
 * // { left: 50, top: 30, width: 40, height: 30 }
 * ```
 *
 */
export function snapAbove(target: Rect, source: Rect): Rect {
    return placeAboveBy(target, source, 0)
}
