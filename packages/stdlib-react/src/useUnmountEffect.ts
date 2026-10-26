import { useEffect, useRef } from "react"
import { useLatest } from "./internals/useLatest"

/**
 * `useUnmountEffect(effect)`
 *
 * Calls `effect` once the component unmounted, for what lives as long as the component: disposing a
 * document, closing a popover.
 *
 * - calls `effect` of the last render, not the one of the first
 * - `<StrictMode>` unmounts and remounts every component in development without calling `effect`:
 *   the call waits a microtask, and is skipped when the component mounted again
 *
 * ```tsx
 * function Editor({ task }: { task: Task }) {
 *     const [document] = useState(() => createDocument(task));
 *     useUnmountEffect(() => document.dispose());
 * }
 * ```
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
