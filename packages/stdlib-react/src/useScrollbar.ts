import type { Memo, ReadonlySignal } from "@monstermann/stdlib"
import { batch, Timer } from "@monstermann/stdlib"
import { DOM } from "@monstermann/stdlib-web"
import { useEffect } from "react"
import { useCreateMemo } from "./internals/useCreateMemo"
import { useCreateSignal } from "./internals/useCreateSignal"

export interface Scrollbar {
    /** Whether the pointer is over the element that scrolls. */
    readonly $hovered: ReadonlySignal<boolean>
    /** Whether the content is taller than the element, and there is something to scroll. */
    readonly $overflows: Memo<boolean>
    /** How far the element is scrolled, from `0` at the top to `1` at the bottom: where the thumb is on the track. */
    readonly $progress: Memo<number>
    /** How much of the content is in view, from `0` to `1`: how much of the track the thumb covers. */
    readonly $ratio: Memo<number>
    /** Whether the element scrolled within the last 500 milliseconds. */
    readonly $scrolling: ReadonlySignal<boolean>
    /** Scrolls to `progress`, from `0` at the top to `1` at the bottom: where the thumb is dragged to. */
    readonly scrollTo: (progress: number) => void
}

/**
 * `useScrollbar(scrollElement, contentElement)`
 *
 * What a scrollbar of its own needs to know about an element that scrolls vertically, for one drawn over the content instead of the one of the browser, which is hidden with `scrollbar-width: none`.
 *
 * - `contentElement` is the element inside of `scrollElement` that has the height of the content: the scroll height changes with it
 * - signals only: the component calling the hook does not render again when the element scrolls, the scrollbar that reads them does
 * - the listeners are there while both elements are, and move with them
 *
 * ```tsx
 * function List() {
 *     const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
 *     const [contentElement, setContentElement] = useState<HTMLElement | null>(null);
 *     const scrollbar = useScrollbar(scrollElement, contentElement);
 *
 *     return (
 *         <div className="relative">
 *             <div className="overflow-y-auto" ref={setScrollElement} style={{ scrollbarWidth: "none" }}>
 *                 <div ref={setContentElement}>{children}</div>
 *             </div>
 *             <Thumb scrollbar={scrollbar} />
 *         </div>
 *     );
 * }
 *
 * function Thumb({ scrollbar }: { scrollbar: Scrollbar }) {
 *     if (!scrollbar.$overflows()) return null;
 *     const height = scrollbar.$ratio() * 100;
 *     return (
 *         <div
 *             className="absolute top-0 right-0 w-1 transition-opacity"
 *             style={{
 *                 height: `${height}%`,
 *                 top: `${scrollbar.$progress() * (100 - height)}%`,
 *                 opacity: scrollbar.$scrolling() || scrollbar.$hovered() ? 0.2 : 0,
 *             }}
 *         />
 *     );
 * }
 * ```
 */
export function useScrollbar(scrollElement: HTMLElement | null, contentElement: HTMLElement | null): Scrollbar {
    const $clientHeight = useCreateSignal(0)
    const $hovered = useCreateSignal(false)
    const $scrollHeight = useCreateSignal(0)
    const $scrolling = useCreateSignal(false)
    const $scrollTop = useCreateSignal(0)
    const $overflows = useCreateMemo(() => $scrollHeight() > $clientHeight())
    const $progress = useCreateMemo(() => {
        const max = $scrollHeight() - $clientHeight()
        return max > 0 ? Math.min(1, $scrollTop() / max) : 0
    })
    const $ratio = useCreateMemo(() => $overflows() ? $clientHeight() / $scrollHeight() : 1)

    useEffect(() => {
        if (!scrollElement || !contentElement) return

        const controller = new AbortController()
        const options = { passive: true, signal: controller.signal }
        let stopScrolling: (() => void) | undefined

        const measure = (): void => batch(() => {
            $clientHeight(scrollElement.clientHeight)
            $scrollHeight(scrollElement.scrollHeight)
            $scrollTop(scrollElement.scrollTop)
        })

        scrollElement.addEventListener("scroll", () => {
            stopScrolling?.()
            stopScrolling = Timer.timeout(500, () => $scrolling(false))
            batch(() => {
                $scrollTop(scrollElement.scrollTop)
                $scrolling(true)
            })
        }, options)
        scrollElement.addEventListener("pointerenter", () => $hovered(true), options)
        scrollElement.addEventListener("pointerleave", () => $hovered(false), options)

        const stopScroll = DOM.observeSize(scrollElement, measure)
        const stopContent = DOM.observeSize(contentElement, measure)

        return () => {
            controller.abort()
            stopScroll()
            stopContent()
            stopScrolling?.()
            batch(() => {
                $hovered(false)
                $scrolling(false)
            })
        }
    }, [scrollElement, contentElement])

    return {
        $hovered,
        $overflows,
        $progress,
        $ratio,
        $scrolling,
        scrollTo: (progress) => {
            if (scrollElement) setScrollTop(scrollElement, progress * (scrollElement.scrollHeight - scrollElement.clientHeight))
        },
    }
}

// Its own function: React Compiler skips a hook that writes to an element it was passed.
function setScrollTop(element: HTMLElement, top: number): void {
    element.scrollTop = top
}
