import type { Rect } from "."

/**
 * # area
 *
 * ```ts
 * function Rect.area(rect: Rect): number
 * ```
 *
 * Calculates the area of a rectangle by multiplying its width and height.
 *
 * ## Example
 *
 * ```ts
 * Rect.area({ left: 10, top: 20, width: 100, height: 50 });
 * // 5000
 * ```
 *
 */
export function area(rect: Rect): number {
    return rect.width * rect.height
}
