import type { Rect } from "."

/**
 * # right
 *
 * ```ts
 * function Rect.right(rect: Rect): number
 * ```
 *
 * The x-coordinate of the right edge: `left + width`.
 *
 * ## Example
 *
 * ```ts
 * Rect.right({ left: 10, top: 20, width: 100, height: 50 });
 * // 110
 * ```
 */
export function right(rect: Rect): number {
    return rect.left + rect.width
}
