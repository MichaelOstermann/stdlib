import type { ReadonlySignal } from "@monstermann/stdlib"
import { Effect, Memo, peek } from "@monstermann/stdlib"
import { useSyncExternalStore } from "react"

/**
 * `useReactive(value)`
 *
 * Returns the value of a signal or a memo, and renders the component again when it changes. A
 * function is turned into a memo: the component only renders again when it returns something else.
 *
 * - `@monstermann/stdlib-transform` writes it for you, wherever a component or a hook reads
 *   something that starts with a `$`
 *
 * ```tsx
 * const $count = Signal(0);
 * const $double = Memo(() => $count() * 2);
 *
 * function Counter({ offset }: { offset: number }) {
 *     const count = useReactive($count);
 *     const double = useReactive($double);
 *     const total = useReactive(() => $count() + offset);
 *
 *     return <button onClick={() => $count(count + 1)}>{total}</button>;
 * }
 * ```
 */
export function useReactive<T>(value: ReadonlySignal<T> | Memo<T> | (() => T)): T {
    const read = "kind" in value ? value : Memo(value)

    const subscribe = (onChange: () => void) => {
        // The first run only subscribes: React already has the current value.
        let isFirst = true
        return Effect(() => {
            read()
            // `peek`: signals read while React handles `onChange` must not become dependencies of this effect.
            if (!isFirst) peek(onChange)
            isFirst = false
        })
    }

    // `peek` here too: a render can happen inside another signal effect, which must not track the signals read here.
    const getSnapshot = () => peek(read)

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
