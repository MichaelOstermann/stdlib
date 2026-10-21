import type { Updated } from "../internals/types"
import { indexOf, removeAt } from "../internals/arrays"

/**
 * # removeLast
 *
 * ```ts
 * Array.removeLast(target, value)
 * ```
 *
 * Removes the last occurrence of `value`.
 * Returns `target` itself when it does not occur.
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
