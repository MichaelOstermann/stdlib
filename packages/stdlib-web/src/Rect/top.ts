import type { Rect } from "."

/**
 * # top
 *
 * ```ts
 * function Rect.top(rect: Rect): number
 * ```
 *
 * Gets the top y-coordinate of a rectangle.
 *
 * ## Example
 *
 * ```ts
 * Rect.top({ left: 10, top: 20, width: 100, height: 50 });
 * // 20
 * ```
 *
 */
export function top(rect: Rect): number {
    return rect.top
}
