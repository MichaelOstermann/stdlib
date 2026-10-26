/**
 * # onAncestorScroll
 *
 * ```ts
 * function DOM.onAncestorScroll(element: Element, listener: () => void): () => void
 * ```
 *
 * Calls `listener` when an element that `element` is inside of scrolls, which moves `element` on
 * screen. Returns what stops listening. The ancestors that can scroll are looked up once, by their
 * `overflow`.
 *
 * ## Example
 *
 * ```ts
 * const stop = DOM.onAncestorScroll(button, () => tooltip.close());
 * stop();
 * ```
 */
export function onAncestorScroll(element: Element, listener: () => void): () => void {
    const controller = new AbortController()
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (canScroll(ancestor)) ancestor.addEventListener("scroll", listener, { passive: true, signal: controller.signal })
    }
    return () => controller.abort()
}

function canScroll(element: Element): boolean {
    const { display, overflow, overflowX, overflowY } = getComputedStyle(element)
    return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents"
}
