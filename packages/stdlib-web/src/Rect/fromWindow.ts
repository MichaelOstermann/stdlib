import type { Rect } from "."

/**
 * # fromWindow
 *
 * ```ts
 * function Rect.fromWindow(): Rect
 * ```
 *
 * The rect of the viewport: at `0, 0`, with the size of `innerWidth` and `innerHeight`.
 *
 * ## Example
 *
 * ```ts
 * Rect.fromWindow();
 * // { left: 0, top: 0, width: 1920, height: 1080 }
 * ```
 */
export function fromWindow(): Rect {
    return {
        height: window.innerHeight,
        left: 0,
        top: 0,
        width: window.innerWidth,
    }
}
