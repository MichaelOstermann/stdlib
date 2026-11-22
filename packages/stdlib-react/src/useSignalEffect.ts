import type { EffectContext } from "@monstermann/stdlib"
import { Effect } from "@monstermann/stdlib"
import { useEffect } from "react"

/**
 * `useSignalEffect(callback)`
 *
 * Creates an effect when the component mounts and disposes the effect when the component unmounts.
 * The effect runs again when a signal it read changes. A new `callback` creates the effect again.
 * `callback` changes when a value it uses from the component changes.
 *
 * - `@monstermann/stdlib-transform` inserts `useSignalEffect` wherever a component or a hook calls
 *   `Effect`
 */
export function useSignalEffect(callback: (this: EffectContext) => (() => void) | void): void {
    useEffect(() => Effect(callback), [callback])
}
