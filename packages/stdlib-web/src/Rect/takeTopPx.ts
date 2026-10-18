import type { Rect } from "."
import { dropBottomPx } from "./dropBottomPx"

/**
 * # takeTopPx
 *
 * ```ts
 * function Rect.takeTopPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Keeps the top `amount` pixels, at most the height.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeTopPx({ left: 10, top: 20, width: 100, height: 80 }, 20);
 * // { left: 10, top: 20, width: 100, height: 20 }
 * ```
 */
export function takeTopPx(rect: Rect, amount: number): Rect {
    return dropBottomPx(rect, rect.height - amount)
}
