import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { observeMove } from "../internals/observeMove"
import { nothing, sensor } from "../internals/sensor"
import { fromDOMRect } from "../Rect/fromDOMRect"

const signals = new WeakMap<Element, ReadonlySignal<Rect>>()

/**
 * # observeRect
 *
 * ```ts
 * function DOM.observeRect(element: Element | null): ReadonlySignal<Rect>
 * ```
 *
 * Returns the position and size of an element as a signal, in viewport coordinates like `getBoundingClientRect`.
 *
 * - every call with the same element returns the same signal
 * - the element is only observed while a memo or an effect depends on the signal
 * - a read outside of a memo or an effect measures right away
 * - moving is detected without polling, through an `IntersectionObserver`
 * - `null` returns a signal that is always `Rect.origin`, for an element that is set later
 *
 * ## Example
 *
 * ```ts
 * const $rect = DOM.observeRect(element);
 * Effect(() => console.log($rect().left, $rect().top));
 *
 * // An element that is set later, or changes:
 * const $button = Signal<HTMLElement | null>(null);
 * const $buttonRect = Memo(() => DOM.observeRect($button())());
 * ```
 */
export function observeRect(element: Element | null): ReadonlySignal<Rect> {
    if (!element) return nothing()
    let $rect = signals.get(element)
    if (!$rect) {
        const measure = (): Rect => fromDOMRect(element.getBoundingClientRect())
        signals.set(element, $rect = sensor(measure, (set) => {
            set(measure())
            return observeMove(element, rect => set(fromDOMRect(rect)))
        }))
    }
    return $rect
}
