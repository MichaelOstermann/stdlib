import type { Rect } from "../Rect"
import { bottom } from "../Rect/bottom"
import { fromElement } from "../Rect/fromElement"
import { right } from "../Rect/right"

// How close to an edge of a container the pointer starts scrolling it, and how many pixels it scrolls per frame at most, right at the edge.
const EDGE = 100
const SPEED = 20

/**
 * # autoscroll
 *
 * ```ts
 * function DOM.autoscroll(containers: () => Iterable<HTMLElement>, onScroll?: () => void): () => void
 * ```
 *
 * Scrolls the containers that the pointer is near an edge of, every frame until stopped, as dragging something to the edge of a list does. Returns what stops it.
 *
 * - a container scrolls once the pointer is within 100px of its edge, faster the closer it gets, at most 20px per frame
 * - `containers` is asked again every frame, so containers that mount while dragging are scrolled too
 * - `onScroll` is called after a frame that scrolled, which moved what is under the pointer
 * - the pointer is followed through `pointermove`, so nothing scrolls before it first moved
 *
 * ## Example
 *
 * ```ts
 * function onDragStart() {
 *     const stop = DOM.autoscroll(() => document.querySelectorAll<HTMLElement>(".list"), updateDropTarget);
 *     document.addEventListener("pointerup", stop, { once: true });
 * }
 * ```
 */
export function autoscroll(containers: () => Iterable<HTMLElement>, onScroll?: () => void): () => void {
    const controller = new AbortController()
    let pointer: { x: number, y: number } | undefined
    let frame = requestAnimationFrame(tick)

    document.addEventListener("pointermove", (event) => {
        pointer = { x: event.clientX, y: event.clientY }
    }, { passive: true, signal: controller.signal })

    function tick(): void {
        frame = requestAnimationFrame(tick)
        if (!pointer) return
        let scrolled = false
        for (const container of containers()) {
            scrolled = scroll(container, fromElement(container), pointer) || scrolled
        }
        if (scrolled) onScroll?.()
    }

    return () => {
        controller.abort()
        cancelAnimationFrame(frame)
    }
}

function scroll(container: HTMLElement, rect: Rect, pointer: { x: number, y: number }): boolean {
    if (pointer.x < rect.left || pointer.x > right(rect) || pointer.y < rect.top || pointer.y > bottom(rect)) return false
    const x = speed(pointer.x, rect.left, right(rect))
    const y = speed(pointer.y, rect.top, bottom(rect))
    if (!x && !y) return false
    const { scrollLeft, scrollTop } = container
    container.scrollBy(x, y)
    return container.scrollLeft !== scrollLeft || container.scrollTop !== scrollTop
}

function speed(position: number, start: number, end: number): number {
    const distance = Math.min(position - start, end - position)
    if (distance >= EDGE) return 0
    const pixels = Math.round(SPEED * (1 - distance / EDGE) ** 2)
    return position - start < end - position ? -pixels : pixels
}
