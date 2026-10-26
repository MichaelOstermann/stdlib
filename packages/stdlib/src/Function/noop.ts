/**
 * # noop
 *
 * ```ts
 * function Function.noop(): void
 * ```
 *
 * Does nothing. Always the same function, unlike a `() => {}` that is written where it is needed,
 * which is a new one every time.
 *
 * ## Example
 *
 * ```ts
 * const onChange = options.onChange ?? Function.noop; // Always the same function.
 *
 * function subscribe(onChange: (value: number) => void = Function.noop) {}
 * ```
 */
export function noop(): void {}
