import type { EffectCallback } from "react"
import { useEffect } from "react"

/**
 * `useMountEffect(effect)`
 *
 * Runs `effect` when the component mounts. Runs the cleanup that `effect` returns when the
 * component unmounts. Works like `useEffect` without dependencies to forget.
 *
 * - `<StrictMode>` runs `effect` and the cleanup twice in development, like any effect
 */
export function useMountEffect(effect: EffectCallback): void {
    useEffect(effect, [])
}
