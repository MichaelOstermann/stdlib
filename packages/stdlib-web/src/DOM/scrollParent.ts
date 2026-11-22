/**
 * # scrollParent
 *
 * Returns the closest ancestor of `element` that the user can scroll on `axis`. Its `overflow` on
 * that axis is `auto`, `scroll` or `overlay`. Returns `null` when only the page scrolls. The page
 * is `document.scrollingElement`, and its `scroll` events go to `window`.
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
