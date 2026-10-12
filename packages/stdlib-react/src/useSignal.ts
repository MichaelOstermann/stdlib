import type { Readable } from "./internals/store"
import { Untrack } from "@monstermann/stdlib"
import { useCallback, useMemo, useSyncExternalStore } from "react"
import { subscribe, toSignal } from "./internals/store"

/**
 * `useSignal(value)`
 *
 * Returns the value of a signal or a memo, and renders the component again when it changes.
 * A function is turned into a memo: the component only renders again when it returns something else.
 *
 * - a function that is created while rendering is a new memo every time, which is fine for what is cheap to compute
 * - with the `react` option of `@monstermann/stdlib-transform` it is written for you, wherever a component or a hook reads something that starts with a `$`
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
export function useSignal<T>(value: Readable<T>): T {
    const read = useMemo(() => toSignal(value), [value])
    const subscribeTo = useCallback((onChange: () => void) => subscribe(read, onChange), [read])
    // Rendering inside of an effect is not something that effect depends on.
    const getSnapshot = useCallback(() => Untrack(read), [read])
    return useSyncExternalStore(subscribeTo, getSnapshot, getSnapshot)
}
