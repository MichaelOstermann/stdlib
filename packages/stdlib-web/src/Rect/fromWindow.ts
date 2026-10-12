import type { Rect } from "."

/**
 * # fromWindow
 *
 * ```ts
 * function Rect.fromWindow(): Rect
 * ```
 *
 * Creates a rectangle representing the browser window's viewport dimensions.
 *
 * ## Example
 *
 * ```ts
 * Rect.fromWindow();
 * // { left: 0, top: 0, width: 1920, height: 1080 }
 * ```
 *
 */
export function fromWindow(): Rect {
    return {
        height: window.innerHeight,
        left: 0,
        top: 0,
        width: window.innerWidth,
    }
}
