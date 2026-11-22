import type { SignalOptions } from "@monstermann/stdlib"
import { Signal } from "@monstermann/stdlib"
import { useState } from "react"

/**
 * `useSignal(value)`
 *
 * Creates a signal once per component. Works like `useState`, but returns a signal.
 *
 * - `value` is only the initial value. Later changes of `value` or `options` are ignored
 * - `@monstermann/stdlib-transform` inserts `useSignal` wherever a component or a hook calls
 *   `Signal`
 */
export function useSignal<T>(value: T, options?: SignalOptions<NoInfer<T>>): Signal<T> {
    return useState(() => Signal(value, options))[0]
}
