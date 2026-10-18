/* eslint-disable @typescript-eslint/no-redeclare -- Signal is a type and what creates it */
import { RawSignal } from "./internals/system"

/** A value that changes over time: call it to read, and with a value or a function to write. */
export interface Signal<T = any> {
    /** Sets the value to what `transform` returns for the current one. */
    (transform: (value: T) => T): void
    /** Sets the value. Nothing is updated when it is the value already. */
    (value: T): void
    /** Returns the value. Inside of a memo or an effect, that one runs again when the value changes. */
    (): T
    readonly kind: "Signal"
}

/** A signal that can only be read. */
export interface ReadonlySignal<T = any> {
    /** Returns the value. Inside of a memo or an effect, that one runs again when the value changes. */
    (): T
    readonly kind: "Signal"
}

export interface SignalOptions<T> {
    /** Whether two values are the same, for a write to be skipped. Only asked when they are not `===`. */
    equals?: (before: T, after: T) => boolean
}

/**
 * `Signal(value, options?)`
 *
 * Creates a value that changes over time. The argument decides what a call does: no argument reads the value, a function computes the next value from the current one, anything else replaces the value.
 * A function can therefore not be a value, unless a function returns it: `$fn(() => fn)`.
 *
 * - memos and effects that read a signal run again when it changes
 * - writing the current value updates nothing, `equals` extends what counts as the same
 *
 * ```ts
 * const $count = Signal(0);
 *
 * $count(); // 0
 * $count(1);
 * $count(count => count + 1);
 * $count(); // 2
 *
 * const $size = Signal({ width: 0, height: 0 }, {
 *     equals: (before, after) => before.width === after.width && before.height === after.height,
 * });
 * ```
 */
export function Signal<T>(value: T, options?: SignalOptions<NoInfer<T>>): Signal<T>
export function Signal<T>(value: T | null, options?: SignalOptions<NoInfer<T> | null>): Signal<T | null>
export function Signal<T>(value: T | undefined | void, options?: SignalOptions<NoInfer<T> | undefined>): Signal<T | undefined>
export function Signal<T>(value: T, options?: SignalOptions<NoInfer<T>>): Signal<T> {
    const raw = new RawSignal(value)
    const equals = options?.equals

    // `arguments` instead of a rest parameter: JavaScriptCore allocates the rest array on every call.
    const signal = function (next?: T | ((value: T) => T)): T | void {
        if (arguments.length === 0) return raw.get()
        const prev = raw.value
        if (typeof next === "function") next = (next as (value: T) => T)(prev)
        if (prev === next || equals?.(prev, next as T)) return
        raw.set(next as T)
    } as { kind: "Signal" } & Signal<T>

    signal.kind = "Signal"

    return signal
}
