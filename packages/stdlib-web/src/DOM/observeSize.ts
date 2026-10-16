import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { Disposer } from "@monstermann/stdlib"
import { nothing, sensor } from "../internals/sensor"

const signals = new WeakMap<Element | Window, ReadonlySignal<Rect>>()

const callbacks = new WeakMap<Element, Set<(entry: ResizeObserverEntry) => void>>()

// Created on first use, so the package can be imported without a DOM, and dropped once it observes nothing.
let observer: ResizeObserver | undefined
let observed = 0

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
        return observe(element, (entry) => {
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

/** Calls `onResize` when the border box of `element` changes size, through one `ResizeObserver` shared by all elements. */
function observe(element: Element, onResize: (entry: ResizeObserverEntry) => void): Disposer {
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

    return Disposer(() => {
        set.delete(onResize)
        if (set.size) return
        callbacks.delete(element)
        observer!.unobserve(element)
        if (--observed) return
        observer!.disconnect()
        observer = undefined
    })
}
