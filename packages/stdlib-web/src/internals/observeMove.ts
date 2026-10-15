import { Disposer } from "@monstermann/stdlib"

/**
 * Calls `onMove` when `element` moves or resizes, without polling.
 *
 * An `IntersectionObserver` whose root margin cuts the viewport down to exactly the element reports
 * as soon as the element leaves that area, which is when the observer is set up again around the new position.
 *
 * Reference: https://github.com/floating-ui/floating-ui/blob/master/packages/dom/src/autoUpdate.ts
 */
export function observeMove(element: Element, onMove: (rect: DOMRectReadOnly) => void): Disposer {
    let io: IntersectionObserver | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined

    const stop = (): void => {
        clearTimeout(timeout)
        io?.disconnect()
        io = undefined
    }

    const refresh = (isFirst: boolean = false, threshold: number = 1): void => {
        stop()

        const rect = element.getBoundingClientRect()
        const { height, left, top, width } = rect
        if (!isFirst) onMove(rect)
        if (!width || !height) return

        const insetTop = Math.floor(top)
        const insetRight = Math.floor(window.innerWidth - (left + width))
        const insetBottom = Math.floor(window.innerHeight - (top + height))
        const insetLeft = Math.floor(left)
        let isFirstEntry = true

        io = new IntersectionObserver((entries) => {
            const ratio = entries[0]!.intersectionRatio

            if (ratio !== threshold) {
                if (!isFirstEntry) return refresh()
                // Not visible at all: checked again in a second, with a threshold that any visible pixel passes.
                if (ratio === 0) timeout = setTimeout(() => refresh(false, 1e-7), 1000)
                else refresh(false, ratio)
            }

            // Fully inside of the area, and still somewhere else than when the observer was set up.
            if (ratio === 1 && !isSameRect(rect, element.getBoundingClientRect())) refresh()

            isFirstEntry = false
        }, {
            rootMargin: `${-insetTop}px ${-insetRight}px ${-insetBottom}px ${-insetLeft}px`,
            threshold: Math.max(0, Math.min(1, threshold)) || 1,
        })

        io.observe(element)
    }

    const ro = new ResizeObserver(() => refresh())
    ro.observe(element)
    refresh(true)

    return Disposer(() => {
        stop()
        ro.disconnect()
    })
}

function isSameRect(a: DOMRectReadOnly, b: DOMRectReadOnly): boolean {
    return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}
