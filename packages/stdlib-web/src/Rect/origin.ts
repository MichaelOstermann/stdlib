import type { Rect } from "."

/**
 * # origin
 *
 * ```ts
 * const Rect.origin: Rect
 * ```
 *
 * A rect at `0, 0` with no width and no height.
 *
 * ## Example
 *
 * ```ts
 * Rect.origin;
 * // { left: 0, top: 0, width: 0, height: 0 }
 * ```
 */
export const origin: Rect = { height: 0, left: 0, top: 0, width: 0 }
