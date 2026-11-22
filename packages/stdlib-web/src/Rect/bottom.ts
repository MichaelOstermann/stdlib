import type { Rect } from "."

/**
 * # bottom
 *
 * Returns the y-coordinate of the bottom edge: `top + height`.
 *
 * ## Example
 *
 * ```ts
 * Rect.bottom({ left: 10, top: 20, width: 100, height: 50 });
 * // 70
 * ```
 */
export function bottom(rect: Rect): number {
    return rect.top + rect.height
}
