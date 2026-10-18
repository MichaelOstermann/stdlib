import type { DependencyList, EffectCallback } from "react"
import { useEffect, useRef } from "react"

/**
 * `useUpdateEffect(effect, deps)`
 *
 * `useEffect` that skips the mount: runs `effect` when `deps` change, for what follows a change and not the value it starts with.
 *
 * - `<StrictMode>` mounting the component again in development is skipped too
 *
 * ```tsx
 * function Select({ open }: { open: boolean }) {
 *     const [filter, setFilter] = useState("");
 *     useUpdateEffect(() => {
 *         if (!open) setFilter("");
 *     }, [open]);
 * }
 * ```
 */
export function useUpdateEffect(effect: EffectCallback, deps: DependencyList): void {
    const mounted = useRef(false)

    // An unmount forgets the mount, for the next mount to be skipped as well.
    useEffect(() => () => {
        mounted.current = false
    }, [])

    useEffect(() => {
        if (mounted.current) return effect()
        mounted.current = true
    }, deps)
}
