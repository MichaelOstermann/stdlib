import type { ReadonlySignal } from "@monstermann/stdlib"
import { batch, Memo } from "@monstermann/stdlib"
import { DOM } from "@monstermann/stdlib-web"
import { useEffect } from "react"
import { setScrollTop } from "./internals/setScrollTop"
import { useSignal } from "./useSignal"

export interface Scrollbar {
    /** Whether the pointer is over the element that scrolls. */
    readonly $hovered: ReadonlySignal<boolean>
    /** Whether the content is taller than the element, so there is something to scroll. */
    readonly $overflows: ReadonlySignal<boolean>
    /**
     * How far the element is scrolled, from `0` at the top to `1` at the bottom. This is where the
     * thumb sits on the track.
     */
    readonly $progress: ReadonlySignal<number>
    /**
     * How much of the content is in view, from `0` to `1`. This is how much of the track the thumb
     * covers.
     */
    readonly $ratio: ReadonlySignal<number>
    /** Whether the element scrolled within the last 500 milliseconds. */
    readonly $scrolling: ReadonlySignal<boolean>
    /**
     * Scrolls to `progress`, from `0` at the top to `1` at the bottom. Pass the position the thumb
     * is dragged to.
     */
    readonly scrollTo: (progress: number) => void
}

/**
 * `useScrollbar(scrollElement, contentElement)`
 *
 * Returns what a custom scrollbar needs to know about an element that scrolls vertically. The
 * custom scrollbar is drawn over the content. Hide the browser scrollbar with
 * `scrollbar-width: none`.
 *
 * - `contentElement` is the element inside `scrollElement` that has the height of the content. The
 *   scroll height changes with `contentElement`
 * - returns only signals. The component calling the hook does not render again on scroll. Only the
 *   scrollbar that reads the signals does
 * - the listeners exist while both elements exist, and move when the elements change
 */
export function useScrollbar(scrollElement: HTMLElement | null, contentElement: HTMLElement | null): Scrollbar {
    const $clientHeight = useSignal(0)
    const $hovered = useSignal(false)
    const $scrollHeight = useSignal(0)
    const $scrolling = useSignal(false)
    const $scrollTop = useSignal(0)
    const $overflows = Memo(() => $scrollHeight() > $clientHeight())
    const $progress = Memo(() => {
        const max = $scrollHeight() - $clientHeight()
        return max > 0 ? Math.min(1, $scrollTop() / max) : 0
    })
    const $ratio = Memo(() => $overflows() ? $clientHeight() / $scrollHeight() : 1)

    useEffect(() => {
        if (!scrollElement || !contentElement) return

        const controller = new AbortController()
        const options = { passive: true, signal: controller.signal }
        let timer: ReturnType<typeof setTimeout> | undefined

        const measure = (): void => batch(() => {
            $clientHeight(scrollElement.clientHeight)
            $scrollHeight(scrollElement.scrollHeight)
            $scrollTop(scrollElement.scrollTop)
        })

        scrollElement.addEventListener("scroll", () => {
            clearTimeout(timer)
            timer = setTimeout(() => $scrolling(false), 500)
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
            clearTimeout(timer)
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
