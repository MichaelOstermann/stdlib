import { DOM } from "@monstermann/stdlib-web"
import { useLayoutEffect, useRef, useState } from "react"
import { setScrollTop } from "./internals/setScrollTop"
import { useLatest } from "./internals/useLatest"

export interface VirtualItem {
    index: number
    /** The height of the item. */
    size: number
    /** The distance from the top of the content to the item. */
    start: number
}

export interface UseVirtualizerOptions {
    count: number
    /** Room for an item dragged over the list: `size` pixels before the item at `index`, which moves the items from there down. */
    gap?: { index: number, size: number } | null
    /** How many items are rendered above and below the ones in view. `2` by default. */
    overscan?: number
    /** The height of every item, or of the item at an index. */
    size: number | ((index: number) => number)
}

export interface Virtualizer {
    /** The height of all items: the height of the element that holds them. */
    height: number
    /** The items to render, each positioned at its `start`. */
    items: VirtualItem[]
    /** Scrolls as little as needed for the item at `index` to be in view. `topOffset` is what covers the top of the element, a sticky header. */
    scrollToIndex: (index: number, topOffset?: number) => void
}

interface Layout {
    count: number
    ends: Float64Array
    overscan: number
    starts: Float64Array
}

interface Range {
    end: number
    start: number
}

/**
 * `useVirtualizer(scrollElement, options)`
 *
 * Renders only the items of a long list that are in view of `scrollElement`, which scrolls vertically.
 *
 * - the component renders again when other items come into view, not for each scroll event
 * - the items are in view before the browser paints: on mount, when the element resizes, and when `count`, `size` or `gap` change
 * - with a `size` number, all items have that height; a function is called for each item whenever `count`, `gap` or the function change
 *
 * ```tsx
 * function Tasks({ tasks }: { tasks: Task[] }) {
 *     const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
 *     const { height, items } = useVirtualizer(scrollElement, {
 *         count: tasks.length,
 *         size: index => tasks[index].dueDate ? 64 : 48,
 *     });
 *
 *     return (
 *         <div className="overflow-y-auto" ref={setScrollElement}>
 *             <div className="relative" style={{ height }}>
 *                 {items.map(item => (
 *                     <Task key={tasks[item.index].id} task={tasks[item.index]} style={{ position: "absolute", top: item.start, height: item.size }} />
 *                 ))}
 *             </div>
 *         </div>
 *     );
 * }
 * ```
 */
export function useVirtualizer(scrollElement: HTMLElement | null, options: UseVirtualizerOptions): Virtualizer {
    const { count, gap, overscan = 2, size } = options

    const starts = new Float64Array(count)
    const ends = new Float64Array(count)
    let height = 0
    for (let i = 0; i < count; i++) {
        if (gap?.index === i) height += gap.size
        starts[i] = height
        height += typeof size === "number" ? size : size(i)
        ends[i] = height
    }
    if (gap?.index === count) height += gap.size

    const [range, setRange] = useState<Range>({ end: 0, start: 0 })
    const layoutRef = useLatest<Layout>({ count, ends, overscan, starts })
    // The scroll position and the height of the element, as of its last scroll or resize.
    const view = useRef({ height: 0, top: 0 })
    // The range of the last `setRange`, which may not be rendered yet.
    const requested = useRef(range)

    // Skipped for an unchanged range: `setRange` with an equal object still renders the component.
    const update = (): void => {
        const next = visibleRange(layoutRef.current, view.current)
        if (next.start === requested.current.start && next.end === requested.current.end) return
        requested.current = next
        setRange(next)
    }

    // After every render, for a new `count`, `size` or `gap`. Declared after `useLatest`, so its layout effect runs second and `layoutRef` already holds the new layout.
    useLayoutEffect(update)

    useLayoutEffect(() => {
        if (!scrollElement) return

        const measure = (): void => {
            view.current.height = scrollElement.clientHeight
            view.current.top = scrollElement.scrollTop
            update()
        }

        const controller = new AbortController()
        scrollElement.addEventListener("scroll", measure, { passive: true, signal: controller.signal })
        const stop = DOM.observeSize(scrollElement, measure)

        return () => {
            controller.abort()
            stop()
        }
    }, [scrollElement, update])

    const items: VirtualItem[] = []
    // `range` can still come from a longer list until the effect above updates it.
    for (let i = range.start; i < Math.min(range.end, count); i++) {
        items.push({ index: i, size: ends[i]! - starts[i]!, start: starts[i]! })
    }

    const scrollToIndex = (index: number, topOffset = 0): void => {
        if (!scrollElement || index < 0 || index >= count) return
        const { clientHeight, scrollTop } = scrollElement
        const top = starts[index]!
        const bottom = ends[index]!
        if (top < scrollTop + topOffset) setScrollTop(scrollElement, top - topOffset)
        else if (bottom > scrollTop + clientHeight) setScrollTop(scrollElement, bottom - clientHeight)
        else return
        // Updated right away, so the items at the new position render without waiting for the scroll event.
        view.current.top = scrollElement.scrollTop
        update()
    }

    return { height, items, scrollToIndex }
}

/** The items in view, and `overscan` more on both sides. */
function visibleRange({ count, ends, overscan, starts }: Layout, view: { height: number, top: number }): Range {
    const bottom = view.top + view.height
    const start = Math.max(0, firstIndex(count, i => ends[i]! > view.top) - overscan)
    const end = Math.min(count, firstIndex(count, i => starts[i]! >= bottom) + overscan)
    return { end, start }
}

/** The first index below `count` for which `test` is true, or `count` for none: a binary search, `test` is false up to some index and true from there. */
function firstIndex(count: number, test: (index: number) => boolean): number {
    let low = 0
    let high = count
    while (low < high) {
        const middle = (low + high) >>> 1
        if (test(middle)) high = middle
        else low = middle + 1
    }
    return low
}
