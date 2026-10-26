/**
 * # roundByDPR
 *
 * ```ts
 * function DOM.roundByDPR(value: number): number
 * ```
 *
 * Rounds CSS pixels to the nearest device pixel. An element positioned between device pixels is
 * blurry.
 *
 * ## Example
 *
 * ```ts
 * // window.devicePixelRatio === 2
 * DOM.roundByDPR(10.3); // 10.5
 * DOM.roundByDPR(10.2); // 10
 * ```
 */
export function roundByDPR(value: number): number {
    const dpr = window.devicePixelRatio || 1
    return Math.round(value * dpr) / dpr
}
