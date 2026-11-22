let context: OffscreenCanvasRenderingContext2D | undefined

/**
 * # measureTextHeight
 *
 * Returns the height of inline text in `font`, a CSS `font` such as `"500 16px Inter"`. The height
 * is the ascent plus the descent: the area that a background or a selection paints. `line-height`
 * does not change it. The measurement uses a canvas, without the DOM or a layout.
 *
 * - a font that has not loaded yet is measured as its fallback. `document.fonts.load(font)` waits
 *   for the font
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
