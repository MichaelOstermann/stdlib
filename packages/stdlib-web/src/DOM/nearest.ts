import type { Rect } from "../Rect"
import { distance } from "../Rect/distance"
import { fromElement } from "../Rect/fromElement"

/**
 * # nearest
 *
 * Returns the element closest to `target`, by the distance between their edges. An element that
 * touches or overlaps `target` has a distance of `0`. Among those, the first element wins.
 *
 * ## Example
 *
 * ```ts
 * // Which section the pointer is over, or else next to, while dragging:
 * const pointer = { left: event.clientX, top: event.clientY, width: 1, height: 1 };
 * DOM.nearest(document.querySelectorAll<HTMLElement>(".section"), pointer);
 * ```
 */
export function nearest<T extends HTMLElement>(elements: Iterable<T>, target: Rect): T | undefined {
    let nearest: T | undefined
    let nearestDistance = Infinity
    for (const element of elements) {
        const elementDistance = distance(fromElement(element), target)
        if (elementDistance >= nearestDistance) continue
        nearest = element
        nearestDistance = elementDistance
    }
    return nearest
}
