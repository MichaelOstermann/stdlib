import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { Disposer } from "@monstermann/stdlib"
import { observeResize } from "../internals/observeResize"
import { nothing, sensor } from "../internals/sensor"

const signals = new WeakMap<Element | Window, ReadonlySignal<Rect>>()

/**
 * # observeSize
 *
 * ```ts
 * function DOM.observeSize(target: Element | Window | null): ReadonlySignal<Rect>
 * ```
 *
 * Returns the size of an element as a signal: a rect at `0, 0` with the width and height of its border box.
 * For a window, the rect has the size of its viewport: `innerWidth` and `innerHeight`.
 * Cheaper than `DOM.observeRect`, for when the position does not matter.
 *
 * - every call with the same target returns the same signal
 * - the target is only observed while a memo or an effect depends on the signal
 * - a read outside of a memo or an effect measures right away
 * - `null` returns a signal that is always `Rect.origin`, for an element that is set later
 *
 * ## Example
 *
 * ```ts
 * const $size = DOM.observeSize(element);
 * Effect(() => console.log($size().width, $size().height));
 *
 * const $boundary = Memo(() => Rect.shrink(DOM.observeSize(window)(), 10));
 *
 * // An element that is set later, or changes:
 * const $popover = Signal<HTMLElement | null>(null);
 * const $popoverSize = Memo(() => DOM.observeSize($popover())());
 * ```
 */
export function observeSize(target: Element | Window | null): ReadonlySignal<Rect> {
    if (!target) return nothing()
    let $size = signals.get(target)
    if (!$size) signals.set(target, $size = "getBoundingClientRect" in target ? observeElement(target) : observeViewport(target))
    return $size
}

function observeElement(element: Element): ReadonlySignal<Rect> {
    const measure = (): Rect => {
        const { height, width } = element.getBoundingClientRect()
        return { height, left: 0, top: 0, width }
    }

    return sensor(measure, (set) => {
        set(measure())
        return observeResize(element, (entry) => {
            const size = entry.borderBoxSize[0]
            if (size) set({ height: size.blockSize, left: 0, top: 0, width: size.inlineSize })
        })
    })
}

function observeViewport(window: Window): ReadonlySignal<Rect> {
    const measure = (): Rect => ({ height: window.innerHeight, left: 0, top: 0, width: window.innerWidth })

    return sensor(measure, (set) => {
        const controller = new AbortController()
        set(measure())
        window.addEventListener("resize", () => set(measure()), { passive: true, signal: controller.signal })
        return Disposer(() => controller.abort())
    })
}
