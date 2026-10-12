import type { Rect } from "."

/**
 * # width
 *
 * ```ts
 * function Rect.width(rect: Rect): number
 * ```
 *
 * Gets the width of a rectangle.
 *
 * ## Example
 *
 * ```ts
 * Rect.width({ left: 10, top: 20, width: 100, height: 50 });
 * // 100
 * ```
 *
 */
export function width(rect: Rect): number {
    return rect.width
}
