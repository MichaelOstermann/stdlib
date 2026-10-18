import type { Rect } from "."
import { isEqual } from "./isEqual"

/**
 * # normalize
 *
 * ```ts
 * function Rect.normalize(rect: Rect): Rect
 * ```
 *
 * Turns a negative width or height positive, and moves `left` or `top` so the rect covers the same area.
 *
 * ## Example
 *
 * ```ts
 * Rect.normalize({ left: 50, top: 60, width: -30, height: -40 });
 * // { left: 20, top: 20, width: 30, height: 40 }
 * ```
 */
export function normalize(rect: Rect): Rect {
    const result = {
        height: Math.abs(rect.height),
        left: rect.width < 0 ? rect.left + rect.width : rect.left,
        top: rect.height < 0 ? rect.top + rect.height : rect.top,
        width: Math.abs(rect.width),
    }
    return isEqual(result, rect) ? rect : result
}
