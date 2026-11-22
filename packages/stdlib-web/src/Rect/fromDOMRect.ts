import type { Rect } from "."

/**
 * # fromDOMRect
 *
 * Copies the position and size of a `DOMRect` into a plain object. `getBoundingClientRect` returns
 * a `DOMRect`, for example.
 *
 * ## Example
 *
 * ```ts
 * const domRect = element.getBoundingClientRect();
 * Rect.fromDOMRect(domRect);
 * // { left: 10, top: 20, width: 100, height: 50 }
 * ```
 */
export function fromDOMRect(rect: DOMRectReadOnly): Rect {
    return {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
    }
}
