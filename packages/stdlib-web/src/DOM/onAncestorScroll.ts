import { Disposer } from "@monstermann/stdlib"

/**
 * # onAncestorScroll
 *
 * ```ts
 * function DOM.onAncestorScroll(element: Element, listener: () => void): Disposer
 * ```
 *
 * Calls `listener` when an element that `element` is inside of scrolls, which moves `element` on screen. Disposing stops listening.
 * The ancestors that can scroll are looked up once, by their `overflow`.
 *
 * ## Example
 *
 * ```ts
 * const listener = DOM.onAncestorScroll(button, () => tooltip.close());
 * listener.dispose();
 * ```
 */
export function onAncestorScroll(element: Element, listener: () => void): Disposer {
    const controller = new AbortController()
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (canScroll(ancestor)) ancestor.addEventListener("scroll", listener, { passive: true, signal: controller.signal })
    }
    return Disposer(() => controller.abort())
}

function canScroll(element: Element): boolean {
    const { display, overflow, overflowX, overflowY } = getComputedStyle(element)
    return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents"
}
