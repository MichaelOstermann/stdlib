import type { EffectCallback } from "react"
import { useEffect } from "react"

/**
 * `useMountEffect(effect)`
 *
 * Runs `effect` once the component mounted, and what it returns once it unmounted: `useEffect`
 * without dependencies to forget.
 *
 * - `<StrictMode>` runs both twice in development, like for any effect
 */
export function useMountEffect(effect: EffectCallback): void {
    useEffect(effect, [])
}
