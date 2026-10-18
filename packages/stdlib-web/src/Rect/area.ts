import type { Rect } from "."

/**
 * # area
 *
 * ```ts
 * function Rect.area(rect: Rect): number
 * ```
 *
 * The width times the height.
 *
 * ## Example
 *
 * ```ts
 * Rect.area({ left: 10, top: 20, width: 100, height: 50 });
 * // 5000
 * ```
 */
export function area(rect: Rect): number {
    return rect.width * rect.height
}
