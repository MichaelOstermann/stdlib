import type { Rect } from "."
import { merge } from "./merge"

/**
 * # map
 *
 * ```ts
 * function Rect.map(rect: Rect, transform: (rect: Rect) => Partial<Rect>): Rect
 * ```
 *
 * Merges the properties that `transform` returns into `rect`, like `Rect.merge`.
 *
 * ## Example
 *
 * ```ts
 * Rect.map({ left: 10, top: 20, width: 100, height: 50 }, (r) => ({
 *     width: r.width * 2,
 * }));
 * // { left: 10, top: 20, width: 200, height: 50 }
 * ```
 */
export function map(rect: Rect, transform: (rect: Rect) => Partial<Rect>): Rect {
    return merge(rect, transform(rect))
}
