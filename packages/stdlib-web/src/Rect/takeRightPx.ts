import type { Rect } from "."
import { dropLeftPx } from "./dropLeftPx"

/**
 * # takeRightPx
 *
 * ```ts
 * function Rect.takeRightPx(rect: Rect, amount: number): Rect
 * ```
 *
 * Keeps the right `amount` pixels, at most the width.
 *
 * ## Example
 *
 * ```ts
 * Rect.takeRightPx({ left: 10, top: 20, width: 100, height: 50 }, 30);
 * // { left: 80, top: 20, width: 30, height: 50 }
 * ```
 */
export function takeRightPx(rect: Rect, amount: number): Rect {
    return dropLeftPx(rect, rect.width - amount)
}
