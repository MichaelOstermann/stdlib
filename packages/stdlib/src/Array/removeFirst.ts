import type { Updated } from "../internals/types"
import { indexOf, removeAt } from "../internals/arrays"

/**
 * # removeFirst
 *
 * ```ts
 * Array.removeFirst(target, value)
 * ```
 *
 * Removes the first occurrence of `value`. Returns `target` itself when it does not occur.
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
