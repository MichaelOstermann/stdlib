import type { Updated } from "./internals"
import { indexOf, removeAt } from "./internals"

/**
 * # removeLast
 *
 * Removes the last occurrence of `value`. Returns `target` itself when `value` does not occur.
 *
 * ## Example
 *
 * ```ts
 * Array.removeLast([1, 2, 1], 1); // [1, 2]
 * ```
 */
export function removeLast<T extends readonly unknown[]>(target: T, value: T[number]): Updated<T>
export function removeLast(target: unknown[], value: unknown): unknown[] {
    return removeAt(target, indexOf(target, value, true))
}
