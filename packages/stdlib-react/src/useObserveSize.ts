import type { Rect } from "@monstermann/stdlib-web"
import { DOM } from "@monstermann/stdlib-web"
import { useLayoutEffect } from "react"
import { useLatest } from "./internals/useLatest"

/**
 * `useObserveSize(target, onChange)`
 *
 * Runs `DOM.observeSize` while the component is mounted. Calls `onChange` with the size of `target`
 * right away, and again whenever the size changes.
 *
 * - the first call happens before the browser paints, so a position can depend on the size
 * - a new `target` starts a new observation. A `null` target observes nothing
 * - a new `onChange` does not start a new observation
 * - `onChange` can be a signal: `useObserveSize(element, $size)`
 */
export function useObserveSize(target: Element | Window | null | undefined, onChange: (size: Rect) => void): void {
    const latest = useLatest(onChange)

    useLayoutEffect(() => {
        if (!target) return
        return DOM.observeSize(target, (size) => latest.current(size))
    }, [target, latest])
}
