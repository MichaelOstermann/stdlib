import type { Rect } from "../Rect"
import { roundedAndDeduped } from "../internals/roundedAndDeduped"
import { fromDOMRect } from "../Rect/fromDOMRect"
import { isEqual } from "../Rect/isEqual"

/**
 * # observePosition
 *
 * ```ts
 * function DOM.observePosition(element: Element, onChange: (rect: Rect) => void): () => void
 * ```
 *
 * Calls `onChange` with where an element is right away, and again whenever it moves or resizes: its rect in viewport coordinates, like `getBoundingClientRect` reports it. Returns what stops observing.
 * The size of that rect is the one after transforms such as `scale`, unlike the one of `DOM.observeSize`.
 *
 * - the rect is rounded to whole pixels, and `onChange` is only called when the rounded rect changed
 * - moving is detected without polling, through an `IntersectionObserver`
 *
 * ## Example
 *
 * ```ts
 * const stop = DOM.observePosition(element, rect => console.log(rect.left, rect.top));
 * stop();
 *
 * // An element that is set later, or changes:
 * const $button = Signal<HTMLElement | null>(null);
 * const $buttonRect = Signal(Rect.origin);
 * Effect(() => {
 *     const button = $button();
 *     if (!button) return;
 *     return DOM.observePosition(button, $buttonRect);
 * });
 * ```
 */
export function observePosition(element: Element, onChange: (rect: Rect) => void): () => void {
    const report = roundedAndDeduped(onChange)
    return observe(element, (rect) => report(fromDOMRect(rect)))
}

/**
 * Calls `onMove` right away, and again when `element` moves or resizes, without polling.
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

    const refresh = (threshold: number = 1): void => {
        stop()

        const rect = element.getBoundingClientRect()
        const { height, left, top, width } = rect
        onMove(rect)
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
                if (ratio === 0) timeout = setTimeout(() => refresh(1e-7), 1000)
                else refresh(ratio)
            }

            // Fully visible, yet the element moved since the observer was set up: set it up again.
            if (ratio === 1 && !isEqual(rect, element.getBoundingClientRect())) refresh()

            isFirstEntry = false
        }, {
            rootMargin: `${-insetTop}px ${-insetRight}px ${-insetBottom}px ${-insetLeft}px`,
            threshold: Math.clamp(threshold, 0, 1) || 1,
        })

        io.observe(element)
    }

    const ro = new ResizeObserver(() => refresh())
    ro.observe(element)
    refresh()

    return () => {
        stop()
        ro.disconnect()
    }
}
