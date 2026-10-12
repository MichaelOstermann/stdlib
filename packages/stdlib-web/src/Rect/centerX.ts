import type { Rect } from "."

/**
 * # centerX
 *
 * ```ts
 * function Rect.centerX(rect: Rect): number
 * ```
 *
 * Gets the horizontal center x-coordinate of a rectangle.
 *
 * ## Example
 *
 * ```ts
 * Rect.centerX({ left: 10, top: 20, width: 100, height: 50 });
 * // 60
 * ```
 *
 */
export function centerX(rect: Rect): number {
    return rect.left + rect.width / 2
}
