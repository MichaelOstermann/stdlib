import type { Rect } from "."
import { fromDOMRect } from "./fromDOMRect"

/**
 * # fromElement
 *
 * ```ts
 * function Rect.fromElement(element: HTMLElement): Rect
 * ```
 *
 * The rect of an element in viewport coordinates, from `getBoundingClientRect`.
 *
 * ## Example
 *
 * ```ts
 * const div = document.querySelector("div");
 * Rect.fromElement(div);
 * // { left: 10, top: 20, width: 100, height: 50 }
 * ```
 */
export function fromElement(element: HTMLElement): Rect {
    return fromDOMRect(element.getBoundingClientRect())
}
