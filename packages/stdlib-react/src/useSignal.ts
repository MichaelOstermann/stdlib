import type { ReadonlySignal } from "@monstermann/stdlib"
import { Effect, Memo, peek } from "@monstermann/stdlib"
import { useCallback, useMemo, useSyncExternalStore } from "react"

/**
 * `useSignal(value)`
 *
 * Returns the value of a signal or a memo, and renders the component again when it changes.
 * A function is turned into a memo: the component only renders again when it returns something else.
 *
 * - `@monstermann/stdlib-transform` writes it for you, wherever a component or a hook reads something that starts with a `$`
 *
 * ```tsx
 * const $count = Signal(0);
 * const $double = Memo(() => $count() * 2);
 *
 * function Counter({ offset }: { offset: number }) {
 *     const count = useSignal($count);
 *     const double = useSignal($double);
 *     const total = useSignal(() => $count() + offset);
 *
 *     return <button onClick={() => $count(count + 1)}>{total}</button>;
 * }
 * ```
 */
export function useSignal<T>(value: ReadonlySignal<T> | Memo<T> | (() => T)): T {
    const read = useMemo(() => "kind" in value ? value : Memo(value), [value])

    const subscribe = useCallback((onChange: () => void) => {
        let isFirst = true
        const effect = Effect(() => {
            read()
            // What React does once it is told is not something the effect depends on.
            if (!isFirst) peek(onChange)
            isFirst = false
        })
        return () => effect.dispose()
    }, [read])

    // Rendering inside of an effect is not something that effect depends on either.
    const getSnapshot = useCallback(() => peek(read), [read])

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
