import type { Rect } from "."

/**
 * # isEqual
 *
 * Whether `a` and `b` have the same position and size.
 *
 * ## Example
 *
 * ```ts
 * Rect.isEqual(
 *     { left: 10, top: 20, width: 100, height: 50 },
 *     { left: 10, top: 20, width: 100, height: 50 },
 * );
 * // true
 * ```
 */
export function isEqual(a: Rect, b: Rect): boolean {
    return a === b
        || (a.left === b.left
            && a.width === b.width
            && a.top === b.top
            && a.height === b.height)
}
