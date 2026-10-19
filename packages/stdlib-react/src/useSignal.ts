import { Signal } from "@monstermann/stdlib"
import { useState } from "react"

/**
 * `useSignal(value)`
 *
 * Creates a signal once per component, `useState` as a signal.
 *
 * - `value` is the initial value: when it changes later, the signal keeps its own
 * - `@monstermann/stdlib-transform` writes it for you, wherever a component or a hook calls `Signal`
 *
 * ```tsx
 * function Counter() {
 *     const $count = useSignal(0);
 *     return <button onClick={() => $count($count() + 1)}>{useReactive($count)}</button>;
 * }
 * ```
 */
export function useSignal<T>(value: T): Signal<T> {
    return useState(() => Signal(value))[0]
}
