/**
 * # scrollBy
 *
 * Scrolls `element` by `x` and `y` pixels over `duration` milliseconds. Returns a function that
 * cancels the scroll. After a cancel, `onDone` is not called.
 *
 * `element.scrollBy({ behavior: "smooth" })` picks its own duration and curve. `DOM.scrollBy` can
 * match a CSS transition, and reports when it is done.
 *
 * - `easing` maps the progress from `0` to `1` to the scrolled fraction. Defaults to CSS's `ease`
 * - the distance is clamped to what `element` can scroll. When there is nothing to scroll, `onDone`
 *   is called right away
 * - a `duration` of `0` scrolls right away
 *
 * ## Example
 *
 * ```ts
 * // Scroll a section into view, then highlight it:
 * const cancel = DOM.scrollBy(board, {
 *     x: section.offsetLeft - board.scrollLeft,
 *     duration: 300,
 *     onDone: () => section.animate({ opacity: [0.5, 1] }, 200),
 * });
 * ```
 */
export function scrollBy(element: Element, { duration, easing = ease, onDone, x = 0, y = 0 }: {
    duration: number
    x?: number
    y?: number
    easing?: (progress: number) => number
    onDone?: () => void
}): () => void {
    const startLeft = element.scrollLeft
    const startTop = element.scrollTop
    const left = clamp(startLeft + x, element.scrollWidth - element.clientWidth) - startLeft
    const top = clamp(startTop + y, element.scrollHeight - element.clientHeight) - startTop
    const start = performance.now()
    let frame = 0

    function tick(now: number): void {
        const progress = duration > 0 ? Math.min((now - start) / duration, 1) : 1
        const eased = easing(progress)
        element.scrollLeft = startLeft + left * eased
        element.scrollTop = startTop + top * eased
        if (progress < 1) frame = requestAnimationFrame(tick)
        else onDone?.()
    }

    if (!left && !top) onDone?.()
    else if (duration > 0) frame = requestAnimationFrame(tick)
    else tick(start)
    return () => cancelAnimationFrame(frame)
}

function clamp(value: number, max: number): number {
    return Math.min(Math.max(0, value), Math.max(0, max))
}

// CSS's `ease`, cubic-bezier(0.25, 0.1, 0.25, 1): Newton's method finds where the curve is at `x`, and `y` there is the eased value.
function ease(x: number): number {
    let t = x
    for (let i = 0; i < 8; i++) {
        const error = bezier(t, 0.25, 0.25) - x
        if (Math.abs(error) < 1e-6) break
        t -= error / slope(t, 0.25, 0.25)
    }
    return bezier(t, 0.1, 1)
}

// A cubic bezier from 0 to 1, with `a` and `b` as its control points.
function bezier(t: number, a: number, b: number): number {
    return (((1 + 3 * a - 3 * b) * t + 3 * b - 6 * a) * t + 3 * a) * t
}

function slope(t: number, a: number, b: number): number {
    return (3 * (1 + 3 * a - 3 * b) * t + 2 * (3 * b - 6 * a)) * t + 3 * a
}
