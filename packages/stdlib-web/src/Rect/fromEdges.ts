import type { Rect } from "."

type RectEdges = {
    readonly bottom: number
    readonly left: number
    readonly right: number
    readonly top: number
}

/**
 * # fromEdges
 *
 * ```ts
 * function Rect.fromEdges(edges: { bottom: number, left: number, right: number, top: number }): Rect
 * ```
 *
 * A rect from the coordinates of its four edges. Edges in the wrong order are swapped.
 *
 * ## Example
 *
 * ```ts
 * Rect.fromEdges({ left: 10, top: 20, right: 110, bottom: 70 });
 * // { left: 10, top: 20, width: 100, height: 50 }
 * ```
 */
export function fromEdges(edges: RectEdges): Rect {
    const top = Math.min(edges.top, edges.bottom)
    const left = Math.min(edges.left, edges.right)
    const bottom = Math.max(edges.top, edges.bottom)
    const right = Math.max(edges.left, edges.right)
    return {
        height: bottom - top,
        left,
        top,
        width: right - left,
    }
}
