import type { Rect } from "../Rect"
import { onRoundedChange } from "../internals/onRoundedChange"

const callbacks = new WeakMap<Element, Set<(entry: ResizeObserverEntry) => void>>()

// Created on first use, so the package can be imported without a DOM, and dropped once it observes nothing.
let observer: ResizeObserver | undefined
let observed = 0

/**
 * # observeSize
 *
 * ```ts
 * function DOM.observeSize(target: Element | Window, onChange: (size: Rect) => void): () => void
 * ```
 *
 * Calls `onChange` with the size of an element right away, and again whenever it changes: a rect at `0, 0` with the width and height of its border box. Returns what stops observing.
 * The size is the one of its layout, which transforms such as `scale` do not change, like `ResizeObserver` reports it.
 * For a window, the rect has the size of its viewport: `innerWidth` and `innerHeight`.
 * Cheaper than `DOM.observePosition`, for when the position does not matter.
 *
 * - the size is rounded to whole pixels, and `onChange` is only called when the rounded size changed
 * - all elements share one `ResizeObserver`
 *
 * ## Example
 *
 * ```ts
 * const stop = DOM.observeSize(element, size => console.log(size.width, size.height));
 * stop();
 *
 * // An element that is set later, or changes:
 * const $popover = Signal<HTMLElement | null>(null);
 * const $popoverSize = Signal(Rect.origin);
 * Effect(() => {
 *     const popover = $popover();
 *     if (!popover) return;
 *     return DOM.observeSize(popover, $popoverSize);
 * });
 * ```
 */
export function observeSize(target: Element | Window, onChange: (size: Rect) => void): () => void {
    const report = onRoundedChange(onChange)
    return "getBoundingClientRect" in target ? observeElement(target, report) : observeViewport(target, report)
}

function observeElement(element: Element, report: (size: Rect) => void): () => void {
    // The layout size, as the ResizeObserver reports it. `getBoundingClientRect` would include transforms. SVG elements have no `offsetWidth`.
    if ("offsetWidth" in element) {
        report({ height: (element as HTMLElement).offsetHeight, left: 0, top: 0, width: (element as HTMLElement).offsetWidth })
    }
    else {
        const { height, width } = element.getBoundingClientRect()
        report({ height, left: 0, top: 0, width })
    }

    return observe(element, (entry) => {
        const size = entry.borderBoxSize[0]
        if (size) report({ height: size.blockSize, left: 0, top: 0, width: size.inlineSize })
    })
}

function observeViewport(window: Window, report: (size: Rect) => void): () => void {
    const measure = (): void => report({ height: window.innerHeight, left: 0, top: 0, width: window.innerWidth })
    const controller = new AbortController()
    measure()
    window.addEventListener("resize", measure, { passive: true, signal: controller.signal })
    return () => controller.abort()
}

/** Calls `onResize` when the border box of `element` changes size, through one `ResizeObserver` shared by all elements. */
function observe(element: Element, onResize: (entry: ResizeObserverEntry) => void): () => void {
    observer ??= new ResizeObserver((entries) => {
        for (const entry of entries) {
            for (const callback of callbacks.get(entry.target) ?? []) callback(entry)
        }
    })

    let set = callbacks.get(element)
    if (!set) {
        callbacks.set(element, set = new Set())
        observed++
        // The border box: the default, the content box, does not change with borders or padding.
        observer.observe(element, { box: "border-box" })
    }
    set.add(onResize)

    return () => {
        set.delete(onResize)
        if (set.size) return
        callbacks.delete(element)
        observer!.unobserve(element)
        if (--observed) return
        observer!.disconnect()
        observer = undefined
    }
}
