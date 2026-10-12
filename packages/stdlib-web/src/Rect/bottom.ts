import type { Rect } from "."

/**
 * # bottom
 *
 * ```ts
 * function Rect.bottom(rect: Rect): number
 * ```
 *
 * Gets the bottom y-coordinate of a rectangle.
 *
 * ## Example
 *
 * ```ts
 * Rect.bottom({ left: 10, top: 20, width: 100, height: 50 });
 * // 70
 * ```
 *
 */
export function bottom(rect: Rect): number {
    return rect.top + rect.height
}
