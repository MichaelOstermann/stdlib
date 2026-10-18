import type { Rect } from "."

/**
 * # isEmpty
 *
 * ```ts
 * function Rect.isEmpty(rect: Rect): boolean
 * ```
 *
 * Whether the width or the height is `0`.
 *
 * ## Example
 *
 * ```ts
 * Rect.isEmpty({ left: 10, top: 20, width: 0, height: 50 });
 * // true
 * ```
 */
export function isEmpty(rect: Rect): boolean {
    return rect.width === 0 || rect.height === 0
}
