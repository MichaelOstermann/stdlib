let context: OffscreenCanvasRenderingContext2D | undefined

/**
 * # measureTextHeight
 *
 * ```ts
 * function DOM.measureTextHeight(font: string): number
 * ```
 *
 * The height of inline text in `font`, a CSS `font` such as `"500 16px Inter"`, from its ascent and descent: what its background or a selection paints, which `line-height` does not change.
 * Measured with a canvas, without the DOM or a layout.
 *
 * - a font that has not loaded yet is measured as its fallback, `document.fonts.load(font)` waits for it
 *
 * ## Example
 *
 * ```ts
 * // Padding that makes the background of inline text as tall as its line:
 * await document.fonts.load("16px Inter");
 * const padding = (24 - DOM.measureTextHeight("16px Inter")) / 2;
 * ```
 */
export function measureTextHeight(font: string): number {
    context ??= new OffscreenCanvas(0, 0).getContext("2d")!
    context.font = font
    const metrics = context.measureText("x")
    return metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
}
