import type { Rect } from "."

/**
 * # isEmpty
 *
 * ```ts
 * function Rect.isEmpty(rect: Rect): boolean
 * ```
 *
 * Checks if a rectangle is empty (has zero width or zero height).
 *
 * ## Example
 *
 * ```ts
 * Rect.isEmpty({ left: 10, top: 20, width: 0, height: 50 });
 * // true
 * ```
 *
 */
export function isEmpty(rect: Rect): boolean {
    return rect.width === 0 || rect.height === 0
}
