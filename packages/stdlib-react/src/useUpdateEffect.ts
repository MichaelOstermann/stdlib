import type { DependencyList, EffectCallback } from "react"
import { useEffect, useRef } from "react"

/**
 * `useUpdateEffect(effect, deps)`
 *
 * Works like `useEffect`, but skips the mount. Runs `effect` only when `deps` change, not for the
 * initial values.
 *
 * - the second mount by `<StrictMode>` in development is skipped too
 */
export function useUpdateEffect(effect: EffectCallback, deps: DependencyList): void {
    const mounted = useRef(false)

    // Reset on unmount, so the mount after a `<StrictMode>` remount is skipped as well.
    useEffect(() => () => {
        mounted.current = false
    }, [])

    useEffect(() => {
        if (mounted.current) return effect()
        mounted.current = true
    }, deps)
}
