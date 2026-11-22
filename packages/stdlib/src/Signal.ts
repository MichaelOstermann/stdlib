import { RawSignal } from "./internals/system"

/** A value that changes over time. Call it to read. Call it with a value or a function to write. */
export interface Signal<T = any> {
    /** Sets the value to the result of `transform` for the current value. */
    (transform: (value: T) => T): void
    /** Sets the value. Nothing updates when the value is unchanged. */
    (value: T): void
    /**
     * Returns the value. A memo or an effect that reads the value runs again when it changes.
     */
    (): T
    readonly kind: "Signal"
}

/** A signal that can only be read. */
export interface ReadonlySignal<T = any> {
    /**
     * Returns the value. A memo or an effect that reads the value runs again when it changes.
     */
    (): T
    readonly kind: "Signal"
}

export interface SignalOptions<T> {
    /**
     * Whether two values count as the same, so a write is skipped. Only asked when the values are
     * not `===`.
     */
    equals?: (before: T, after: T) => boolean
}

/**
 * `Signal(value, options?)`
 *
 * Creates a value that changes over time. The argument decides what a call does. No argument reads
 * the value. A function computes the next value from the current value. Anything else replaces the
 * value. So a function can only be stored by returning it from a function: `$fn(() => fn)`.
 *
 * - memos and effects that read a signal run again when the signal changes
 * - writing the current value updates nothing. `equals` widens what counts as the same
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

    // `arguments` instead of a rest parameter, which allocates an array on every call where the function is not inlined.
    const signal = function (next?: T | ((value: T) => T)): T | void {
        if (arguments.length === 0) return raw.get()
        const prev = raw.value
        if (typeof next === "function") next = (next as (value: T) => T)(prev)
        if (Object.is(prev, next) || equals?.(prev, next as T)) return
        raw.set(next as T)
    } as { kind: "Signal" } & Signal<T>

    signal.kind = "Signal"

    return signal
}
