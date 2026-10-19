import type { Rect } from "../Rect"
import { distance } from "../Rect/distance"
import { fromElement } from "../Rect/fromElement"

/**
 * # nearest
 *
 * ```ts
 * function DOM.nearest<T extends HTMLElement>(elements: Iterable<T>, target: Rect): T | undefined
 * ```
 *
 * The element closest to `target`, by the distance between their edges. An element that `target` touches or overlaps is at `0`, and the first of those wins.
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
