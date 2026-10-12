import type { Rect } from "."
import { merge } from "./merge"

/**
 * # transform
 *
 * ```ts
 * function Rect.transform(rect: Rect, transform: (value: number, key: keyof Rect, rect: Rect) => number): Rect
 * ```
 *
 * Applies a transformation function to each numeric property of the rectangle.
 *
 * ## Example
 *
 * ```ts
 * Rect.transform({ left: 10, top: 20, width: 100, height: 50 }, (value, key) =>
 *     key === "left" || key === "top" ? value * 2 : value,
 * );
 * // { left: 20, top: 40, width: 100, height: 50 }
 * ```
 *
 */
export function transform(rect: Rect, transform: (value: number, key: keyof Rect, rect: Rect) => number): Rect {
    return merge(rect, {
        height: transform(rect.height, "height", rect),
        left: transform(rect.left, "left", rect),
        top: transform(rect.top, "top", rect),
        width: transform(rect.width, "width", rect),
    })
}
