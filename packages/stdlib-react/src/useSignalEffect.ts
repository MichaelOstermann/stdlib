import { Effect } from "@monstermann/stdlib"
import { useEffect } from "react"

/**
 * `useSignalEffect(callback)`
 *
 * Creates an effect once the component mounted, and disposes it once it unmounted.
 * The effect runs again when a signal it read changes, and is created again when `callback` changes: when something it uses from the component changes.
 *
 * - `@monstermann/stdlib-transform` writes it for you, wherever a component or a hook calls `Effect`
 *
 * ```tsx
 * function Title({ suffix }: { suffix: string }) {
 *     useSignalEffect(() => {
 *         document.title = `${$title()} ${suffix}`;
 *     });
 *     return null;
 * }
 * ```
 */
export function useSignalEffect(callback: () => (() => void) | void): void {
    useEffect(() => Effect(callback), [callback])
}
