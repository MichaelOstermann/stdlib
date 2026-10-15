import { Disposer } from "@monstermann/stdlib"

const callbacks = new WeakMap<Element, Set<(entry: ResizeObserverEntry) => void>>()

// Created on first use, so the package can be imported without a DOM.
let observer: ResizeObserver | undefined

/** Calls `onResize` when the border box of `element` changes size, through one `ResizeObserver` shared by all elements. */
export function observeResize(element: Element, onResize: (entry: ResizeObserverEntry) => void): Disposer {
    observer ??= new ResizeObserver((entries) => {
        for (const entry of entries) {
            for (const callback of callbacks.get(entry.target) ?? []) callback(entry)
        }
    })

    let set = callbacks.get(element)
    if (!set) callbacks.set(element, set = new Set())
    set.add(onResize)
    // The border box: the default, the content box, does not change with borders or padding.
    observer.observe(element, { box: "border-box" })

    return Disposer(() => {
        set.delete(onResize)
        if (set.size) return
        callbacks.delete(element)
        observer!.unobserve(element)
    })
}
