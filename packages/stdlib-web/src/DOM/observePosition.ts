import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { nothing, sensor } from "../internals/sensor"
import { fromDOMRect } from "../Rect/fromDOMRect"

const signals = new WeakMap<Element, ReadonlySignal<Rect>>()

/**
 * # observePosition
 *
 * ```ts
 * function DOM.observePosition(element: Element | null): ReadonlySignal<Rect>
 * ```
 *
 * Returns where an element is as a signal: its rect in viewport coordinates, like `getBoundingClientRect` reports it.
 * The size of that rect is the one after transforms such as `scale`, unlike the one of `DOM.observeSize`.
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
 * const $position = DOM.observePosition(element);
 * Effect(() => console.log($position().left, $position().top));
 *
 * // An element that is set later, or changes:
 * const $button = Signal<HTMLElement | null>(null);
 * const $buttonPosition = Memo(() => DOM.observePosition($button())());
 * ```
 */
export function observePosition(element: Element | null): ReadonlySignal<Rect> {
    if (!element) return nothing()
    let $rect = signals.get(element)
    if (!$rect) {
        const measure = (): Rect => fromDOMRect(element.getBoundingClientRect())
        signals.set(element, $rect = sensor(measure, (set) => {
            set(measure())
            return observe(element, rect => set(fromDOMRect(rect)))
        }))
    }
    return $rect
}

/**
 * Calls `onMove` when `element` moves or resizes, without polling.
 *
 * An `IntersectionObserver` whose root margin cuts the viewport down to exactly the element reports
 * as soon as the element leaves that area, which is when the observer is set up again around the new position.
 *
 * Reference: https://github.com/floating-ui/floating-ui/blob/master/packages/dom/src/autoUpdate.ts
 */
function observe(element: Element, onMove: (rect: DOMRectReadOnly) => void): () => void {
    let io: IntersectionObserver | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined

    const stop = (): void => {
        clearTimeout(timeout)
        io?.disconnect()
        io = undefined
    }

    const refresh = (isFirst: boolean = false, threshold: number = 1): void => {
        stop()

        const rect = element.getBoundingClientRect()
        const { height, left, top, width } = rect
        if (!isFirst) onMove(rect)
        if (!width || !height) return

        const insetTop = Math.floor(top)
        const insetRight = Math.floor(window.innerWidth - (left + width))
        const insetBottom = Math.floor(window.innerHeight - (top + height))
        const insetLeft = Math.floor(left)
        let isFirstEntry = true

        io = new IntersectionObserver((entries) => {
            const ratio = entries[0]!.intersectionRatio

            if (ratio !== threshold) {
                if (!isFirstEntry) return refresh()
                // Not visible at all: checked again in a second, with a threshold that any visible pixel passes.
                if (ratio === 0) timeout = setTimeout(() => refresh(false, 1e-7), 1000)
                else refresh(false, ratio)
            }

            // Fully inside of the area, and still somewhere else than when the observer was set up.
            if (ratio === 1 && !isSameRect(rect, element.getBoundingClientRect())) refresh()

            isFirstEntry = false
        }, {
            rootMargin: `${-insetTop}px ${-insetRight}px ${-insetBottom}px ${-insetLeft}px`,
            threshold: Math.max(0, Math.min(1, threshold)) || 1,
        })

        io.observe(element)
    }

    const ro = new ResizeObserver(() => refresh())
    ro.observe(element)
    refresh(true)

    return () => {
        stop()
        ro.disconnect()
    }
}

function isSameRect(a: DOMRectReadOnly, b: DOMRectReadOnly): boolean {
    return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}
