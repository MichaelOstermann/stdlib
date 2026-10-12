import type { Rect } from "."

/**
 * # origin
 *
 * ```ts
 * const Rect.origin: Rect
 * ```
 *
 * A constant representing the origin rectangle (positioned at 0,0 with zero width and height).
 *
 * ## Example
 *
 * ```ts [example]
 * Rect.origin;
 * // { left: 0, top: 0, width: 0, height: 0 }
 * ```
 *
 */
export const origin: Rect = { height: 0, left: 0, top: 0, width: 0 }
