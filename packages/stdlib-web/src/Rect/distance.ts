import type { Rect } from "."
import { bottom } from "./bottom"
import { right } from "./right"

/**
 * # distance
 *
 * ```ts
 * function Rect.distance(a: Rect, b: Rect): number
 * ```
 *
 * The shortest distance between the edges of `a` and `b`, `0` when they touch or overlap.
 *
 * ## Example
 *
 * ```ts
 * Rect.distance(
 *     { left: 0, top: 0, width: 50, height: 50 },
 *     { left: 100, top: 0, width: 50, height: 50 },
 * );
 * // 50
 * ```
 */
export function distance(a: Rect, b: Rect): number {
    const x = Math.max(0, a.left - right(b), b.left - right(a))
    const y = Math.max(0, a.top - bottom(b), b.top - bottom(a))
    return Math.hypot(x, y)
}
