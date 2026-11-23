import type { Updated } from "./internals"
import { indexOf, removeAt } from "./internals"

/**
 * # removeFirst
 *
 * Removes the first occurrence of `value`. Returns `target` itself when `value` does not occur.
 *
 * ## Example
 *
 * ```ts
 * Array.removeFirst([1, 2, 1], 1); // [2, 1]
 * ```
 */
export function removeFirst<T extends readonly unknown[]>(target: T, value: T[number]): Updated<T>
export function removeFirst(target: unknown[], value: unknown): unknown[] {
    return removeAt(target, indexOf(target, value, false))
}
