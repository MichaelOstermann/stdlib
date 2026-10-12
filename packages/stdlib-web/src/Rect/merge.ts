import type { Rect } from "."
import { normalize } from "./normalize"

const ks = ["top", "left", "width", "height"] as const

/**
 * # merge
 *
 * ```ts
 * function Rect.merge(target: Rect, source: Partial<Rect>): Rect
 * ```
 *
 * Merges a partial rectangle into a target rectangle, creating a new rectangle with updated properties.
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
 *
 */
export function merge(target: Rect, source: Partial<Rect>): Rect {
    let copy: any
    for (const k of ks) {
        if (source[k] === undefined) continue
        if (target[k] === source[k]) continue
        if (!Number.isFinite(source[k])) return target
        // Not spreading, the properties of eg. a DOMRect are getters of its prototype.
        copy ??= { height: target.height, left: target.left, top: target.top, width: target.width }
        copy[k] = source[k]
    }
    if (!copy) return target
    return normalize(copy)
}
