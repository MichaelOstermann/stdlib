/**
 * # noop
 *
 * Does nothing. `noop` is always the same function. An inline `() => {}` is a new function every
 * time.
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
