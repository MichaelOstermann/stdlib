import type { SignalOptions } from "@monstermann/stdlib"
import { Signal } from "@monstermann/stdlib"
import { useState } from "react"

/**
 * `useSignal(value)`
 *
 * Creates a signal once per component, `useState` as a signal.
 *
 * - `value` is the initial value: when it changes later, the signal keeps its own, and so do
 *   `options`
 * - `@monstermann/stdlib-transform` writes it for you, wherever a component or a hook calls
 *   `Signal`
 *
 * ```tsx
 * function Counter() {
 *     const $count = useSignal(0);
 *     return <button onClick={() => $count($count() + 1)}>{useReactive($count)}</button>;
 * }
 * ```
 */
export function useSignal<T>(value: T, options?: SignalOptions<NoInfer<T>>): Signal<T> {
    return useState(() => Signal(value, options))[0]
}
