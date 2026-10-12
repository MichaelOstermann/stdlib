import type { Rect } from "."

/**
 * # left
 *
 * ```ts
 * function Rect.left(rect: Rect): number
 * ```
 *
 * Gets the left x-coordinate of a rectangle.
 *
 * ## Example
 *
 * ```ts
 * Rect.left({ left: 10, top: 20, width: 100, height: 50 });
 * // 10
 * ```
 *
 */
export function left(rect: Rect): number {
    return rect.left
}
