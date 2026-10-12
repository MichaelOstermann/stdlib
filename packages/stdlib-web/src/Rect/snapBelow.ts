import type { Rect } from "."
import { placeBelowBy } from "./placeBelowBy"

/**
 * # snapBelow
 *
 * ```ts
 * function Rect.snapBelow(target: Rect, source: Rect): Rect
 * ```
 *
 * Positions a `target` rectangle directly below a `source` rectangle with no gap between them. The `target` rectangle's top edge is aligned with the `source` rectangle's top edge (same as placeBelowBy with distance 0).
 *
 * ## Example
 *
 * ```ts
 * Rect.snapBelow(
 *     { left: 50, top: 10, width: 40, height: 30 },
 *     { left: 0, top: 20, width: 100, height: 20 },
 * );
 * // { left: 50, top: 40, width: 40, height: 30 }
 * ```
 *
 */
export function snapBelow(target: Rect, source: Rect): Rect {
    return placeBelowBy(target, source, 0)
}
