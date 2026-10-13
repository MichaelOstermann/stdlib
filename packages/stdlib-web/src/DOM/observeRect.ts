import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { Effect, Untrack } from "@monstermann/stdlib"
import { observeMove } from "../internals/observeMove"
import { sensor } from "../internals/sensor"
import { fromDOMRect } from "../Rect/fromDOMRect"
import { origin } from "../Rect/origin"

/**
 * # observeRect
 *
 * ```ts
 * function DOM.observeRect($element: () => Element | null): ReadonlySignal<Rect>
 * ```
 *
 * Returns the position and size of an element as a signal, in viewport coordinates like `getBoundingClientRect`.
 *
 * - the element is only observed while a memo or an effect depends on the signal
 * - a read outside of a memo or an effect measures the element right away
 * - `Rect.origin` while there is no element
 * - moving is detected without polling, through an `IntersectionObserver`
 *
 * ## Example
 *
 * ```ts
 * const $button = Signal<HTMLElement | null>(null);
 * const $rect = DOM.observeRect($button);
 *
 * Effect(() => console.log($rect().left, $rect().top));
 * ```
 */
export function observeRect($element: () => Element | null): ReadonlySignal<Rect> {
    const measure = (element: Element | null): Rect => element ? fromDOMRect(element.getBoundingClientRect()) : origin

    return sensor(
        () => measure(Untrack($element)),
        set => Effect(() => {
            const element = $element()
            set(measure(element))
            return element ? observeMove(element, rect => set(fromDOMRect(rect))) : undefined
        }).dispose,
    )
}
