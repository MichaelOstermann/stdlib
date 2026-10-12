import type { Rect } from "./types.js"

/**
 * # intersects
 *
 * ```ts
 * function Rect.intersects(a: Rect, b: Rect): boolean
 * ```
 *
 * Checks if two rectangles intersect or overlap with each other.
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
 *
 */
export function intersects(a: Rect, b: Rect): boolean {
    return !(
        a.left >= (b.left + b.width)
        || (a.left + a.width) <= b.left
        || a.top >= (b.top + b.height)
        || (a.top + a.height) <= b.top
    )
}
