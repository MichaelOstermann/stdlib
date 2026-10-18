import type { Rect } from "."
import { dropTopPx } from "./dropTopPx"

/**
 * # takeBottomPx
 *
 * ```ts
 * function Rect.takeBottomPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Keeps the bottom `amount` pixels, at most the height.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeBottomPx({ left: 10, top: 20, width: 100, height: 80 }, 30);
 * // { left: 10, top: 70, width: 100, height: 30 }
 * ```
 */
export function takeBottomPx(rect: Rect, amount: number): Rect {
    return dropTopPx(rect, rect.height - amount)
}
