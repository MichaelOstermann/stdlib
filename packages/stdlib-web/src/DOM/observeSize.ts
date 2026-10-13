import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { Effect, Untrack } from "@monstermann/stdlib"
import { observeResize } from "../internals/observeResize"
import { sensor } from "../internals/sensor"
import { origin } from "../Rect/origin"

/**
 * # observeSize
 *
 * ```ts
 * function DOM.observeSize($element: () => Element | null): ReadonlySignal<Rect>
 * ```
 *
 * Returns the size of an element as a signal: a rect at `0, 0` with the width and height of its border box.
 * Cheaper than `DOM.observeRect`, for when the position does not matter.
 *
 * - the element is only observed while a memo or an effect depends on the signal
 * - a read outside of a memo or an effect measures the element right away
 * - `Rect.origin` while there is no element
 *
 * ## Example
 *
 * ```ts
 * const $popover = Signal<HTMLElement | null>(null);
 * const $size = DOM.observeSize($popover);
 *
 * Effect(() => console.log($size().width, $size().height));
 * ```
 */
export function observeSize($element: () => Element | null): ReadonlySignal<Rect> {
    const measure = (element: Element | null): Rect => {
        if (!element) return origin
        const { height, width } = element.getBoundingClientRect()
        return { height, left: 0, top: 0, width }
    }

    return sensor(
        () => measure(Untrack($element)),
        set => Effect(() => {
            const element = $element()
            set(measure(element))
            if (!element) return
            return observeResize(element, (entry) => {
                const size = entry.borderBoxSize[0]
                if (size) set({ height: size.blockSize, left: 0, top: 0, width: size.inlineSize })
            })
        }).dispose,
    )
}
