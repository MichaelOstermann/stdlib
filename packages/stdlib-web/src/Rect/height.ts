import type { Rect } from "."

/**
 * # height
 *
 * ```ts
 * function Rect.height(rect: Rect): number
 * ```
 *
 * Gets the height of a rectangle.
 *
 * ## Example
 *
 * ```ts
 * Rect.height({ left: 10, top: 20, width: 100, height: 50 });
 * // 50
 * ```
 *
 */
export function height(rect: Rect): number {
    return rect.height
}
