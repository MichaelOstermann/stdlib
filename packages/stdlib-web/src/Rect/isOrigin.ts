import type { Rect } from "."
import { isEqual } from "./isEqual"
import { origin } from "./origin"

/**
 * # isOrigin
 *
 * ```ts
 * function Rect.isOrigin(rect: Rect): boolean
 * ```
 *
 * Checks if a rectangle is the origin rectangle (positioned at 0,0 with zero width and height).
 *
 * ## Example
 *
 * ```ts
 * Rect.isOrigin({ left: 0, top: 0, width: 0, height: 0 });
 * // true
 * ```
 *
 */
export function isOrigin(rect: Rect): boolean {
    return isEqual(rect, origin)
}
