import type { Rect } from "."
import { bottom } from "./bottom"
import { right } from "./right"

/**
 * # contains
 *
 * ```ts
 * function Rect.contains(a: Rect, b: Rect): boolean
 * ```
 *
 * Whether `b` lies entirely inside `a`. Shared edges count as inside.
 *
 * ## Example
 *
 * ```ts
 * Rect.contains(
 *     { left: 0, top: 0, width: 100, height: 100 },
 *     { left: 10, top: 20, width: 50, height: 30 },
 * );
 * // true
 * ```
 */
export function contains(a: Rect, b: Rect): boolean {
    return a.left <= b.left
        && a.top <= b.top
        && right(a) >= right(b)
        && bottom(a) >= bottom(b)
}
