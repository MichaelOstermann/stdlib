import type { Rect } from "."
import { merge } from "./merge"

/**
 * # moveLeftTo
 *
 * ```ts
 * function Rect.moveLeftTo(rect: Rect, left: number): Rect
 * ```
 *
 * Moves the rect so its left edge is at `left`. The size stays.
 *
 * ## Example
 *
 * ```ts
 * Rect.moveLeftTo({ left: 10, top: 20, width: 100, height: 50 }, 50);
 * // { left: 50, top: 20, width: 100, height: 50 }
 * ```
 */
export function moveLeftTo(rect: Rect, left: number): Rect {
    return merge(rect, { left })
}
