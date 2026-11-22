import type { Rect } from "."

/**
 * # centerY
 *
 * The y-coordinate of the center.
 *
 * ## Example
 *
 * ```ts
 * Rect.centerY({ left: 10, top: 20, width: 100, height: 50 });
 * // 45
 * ```
 */
export function centerY(rect: Rect): number {
    return rect.top + rect.height / 2
}
