/**
 * # scrollParent
 *
 * ```ts
 * function DOM.scrollParent(element: Element, axis: "x" | "y"): HTMLElement | null
 * ```
 *
 * The closest element that `element` is inside of and that the user can scroll on `axis`: its `overflow` on that axis is `auto`, `scroll` or `overlay`. `null` when there is none and only the page scrolls, which is `document.scrollingElement`, and whose `scroll` events go to `window`.
 *
 * ## Example
 *
 * ```ts
 * const scroller = DOM.scrollParent(editor, "y");
 * scroller?.addEventListener("scroll", onScroll, { passive: true });
 * ```
 */
export function scrollParent(element: Element, axis: "x" | "y"): HTMLElement | null {
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor)
        const overflow = axis === "x" ? style.overflowX : style.overflowY
        if (overflow === "auto" || overflow === "scroll" || overflow === "overlay") return ancestor
    }
    return null
}
