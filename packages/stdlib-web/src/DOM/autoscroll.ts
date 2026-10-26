import type { Rect } from "../Rect"
import { bottom } from "../Rect/bottom"
import { fromElement } from "../Rect/fromElement"
import { right } from "../Rect/right"

/**
 * # autoscroll
 *
 * ```ts
 * function DOM.autoscroll(containers: () => Iterable<HTMLElement>, options?: {
 *     edge?: number;
 *     speed?: number;
 *     onScroll?: () => void;
 * }): () => void
 * ```
 *
 * Scrolls the containers that the pointer is near an edge of, every frame until stopped, as
 * dragging something to the edge of a list does. Returns what stops it.
 *
 * - a container scrolls once the pointer is within `edge` pixels of its edge, `100` by default,
 *   faster the closer it gets
 * - `speed` is how many pixels it scrolls per frame right at the edge, `20` by default
 * - `onScroll` is called after a frame that scrolled: what is under the pointer moved, although the
 *   pointer did not
 * - `containers` is asked again every frame, so containers that mount while dragging are scrolled
 *   too
 * - the pointer is followed through `pointermove`, so nothing scrolls before it first moved
 *
 * ## Example
 *
 * ```ts
 * function onDragStart() {
 *     const stop = DOM.autoscroll(() => document.querySelectorAll<HTMLElement>(".list"), {
 *         onScroll: updateDropTarget,
 *     });
 *     document.addEventListener("pointerup", stop, { once: true });
 * }
 * ```
 */
export function autoscroll(containers: () => Iterable<HTMLElement>, { edge = 100, onScroll, speed = 20 }: {
    edge?: number
    speed?: number
    onScroll?: () => void
} = {}): () => void {
    const controller = new AbortController()
    let pointer: { x: number, y: number } | undefined
    let frame = requestAnimationFrame(tick)

    document.addEventListener("pointermove", (event) => {
        pointer = { x: event.clientX, y: event.clientY }
    }, { passive: true, signal: controller.signal })

    function tick(): void {
        frame = requestAnimationFrame(tick)
        if (!pointer) return
        // All rects are read before anything scrolls, which would make the browser lay out again for the next read.
        const scrolls = Array.from(containers(), (container) => ({ container, ...amounts(fromElement(container), pointer!) }))
        let scrolled = false
        for (const { container, x, y } of scrolls) {
            if (!x && !y) continue
            const { scrollLeft, scrollTop } = container
            container.scrollBy(x, y)
            scrolled ||= container.scrollLeft !== scrollLeft || container.scrollTop !== scrollTop
        }
        if (scrolled) onScroll?.()
    }

    function amounts(rect: Rect, { x, y }: { x: number, y: number }): { x: number, y: number } {
        if (x < rect.left || x > right(rect) || y < rect.top || y > bottom(rect)) return { x: 0, y: 0 }
        return { x: amount(x, rect.left, right(rect)), y: amount(y, rect.top, bottom(rect)) }
    }

    function amount(position: number, start: number, end: number): number {
        const fromEdge = Math.min(position - start, end - position)
        if (fromEdge >= edge) return 0
        const pixels = Math.round(speed * (1 - fromEdge / edge) ** 2)
        return position - start < end - position ? -pixels : pixels
    }

    return () => {
        controller.abort()
        cancelAnimationFrame(frame)
    }
}
