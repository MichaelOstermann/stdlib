/**
 * # measureTextHeight
 *
 * ```ts
 * function DOM.measureTextHeight(fontSize: number, parent?: Element): number
 * ```
 *
 * The height of inline text at `fontSize`, from its font's ascent and descent: what its background or a selection paints, which `line-height` does not change. Measured with an element that is added to `parent` and removed again, and that has the font of `parent`, `document.body` by default.
 *
 * - it measures every time, a web font that loaded since changes the result
 *
 * ## Example
 *
 * ```ts
 * // Padding that makes the background of inline text as tall as its line:
 * const padding = (24 - DOM.measureTextHeight(16)) / 2;
 * ```
 */
export function measureTextHeight(fontSize: number, parent: Element = document.body): number {
    const probe = document.createElement("div")
    probe.style.cssText = `position:absolute;visibility:hidden;font-size:${fontSize}px`
    const text = document.createElement("span")
    text.textContent = "x"
    probe.append(text)
    parent.append(probe)
    const height = text.getBoundingClientRect().height
    probe.remove()
    return height
}
