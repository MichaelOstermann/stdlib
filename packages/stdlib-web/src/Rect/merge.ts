import type { Rect } from "."
import { normalize } from "./normalize"

const keys = ["top", "left", "width", "height"] as const

/**
 * # merge
 *
 * ```ts
 * function Rect.merge(target: Rect, source: Partial<Rect>): Rect
 * ```
 *
 * Replaces the properties of `target` with the ones in `source`, and normalizes the result.
 * Returns `target` itself when `source` changes nothing, or when a value in `source` is not finite: `NaN` or `Infinity`.
 *
 * ## Example
 *
 * ```ts
 * Rect.merge(
 *     { left: 10, top: 20, width: 100, height: 50 },
 *     { width: 150, height: 75 },
 * );
 * // { left: 10, top: 20, width: 150, height: 75 }
 * ```
 */
export function merge(target: Rect, source: Partial<Rect>): Rect {
    let copy: { -readonly [K in keyof Rect]: number } | undefined
    for (const key of keys) {
        const value = source[key]
        if (value === undefined || value === target[key]) continue
        if (!Number.isFinite(value)) return target
        // Copied property by property: the properties of a DOMRect are getters on its prototype, which a spread skips.
        copy ??= { height: target.height, left: target.left, top: target.top, width: target.width }
        copy[key] = value
    }
    if (!copy) return target
    return normalize(copy)
}
