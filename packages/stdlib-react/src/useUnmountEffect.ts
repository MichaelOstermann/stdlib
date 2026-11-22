import { useEffect, useRef } from "react"
import { useLatest } from "./internals/useLatest"

/**
 * `useUnmountEffect(effect)`
 *
 * Calls `effect` when the component unmounts. Use it to end what lives as long as the component:
 * disposing a document, closing a popover.
 *
 * - calls the `effect` of the last render, not of the first render
 * - `<StrictMode>` unmounts and remounts every component in development. `effect` is not called
 *   then: the call waits a microtask and is skipped when the component mounted again
 */
export function useUnmountEffect(effect: () => void): void {
    const latest = useLatest(effect)
    const mounted = useRef(false)

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
            queueMicrotask(() => {
                if (!mounted.current) latest.current()
            })
        }
    }, [latest])
}
