import type { Rect } from "../Rect"
import { bottom } from "../Rect/bottom"
import { fromElement } from "../Rect/fromElement"
import { right } from "../Rect/right"

/**
 * # autoscroll
 *
 * Scrolls each container when the pointer is near its edge, like dragging an item to the edge of a
 * list. Runs every frame until stopped. Returns a function that stops the scrolling.
 *
 * - a container scrolls once the pointer is within `edge` pixels of its edge, `100` by default. The
 *   closer the pointer, the faster the scroll
 * - `speed` is the number of pixels per frame right at the edge, `20` by default
 * - `onScroll` is called after each frame that scrolled. The content under the pointer moved, even
 *   though the pointer did not
 * - `containers` is called again every frame, so containers that mount while dragging scroll too
 * - the pointer is tracked through `pointermove`, so nothing scrolls before the first move
 *
 * ## Example
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
