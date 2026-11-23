import type { Updated, Values } from "./internals"
import { matcher, removeWhere } from "./internals"

/**
 * # removeAll
 *
 * Removes every occurrence of each of `values`. Returns `target` itself when none of `values`
 * occurs.
 *
 * ## Example
 *
 * ```ts
 * Array.removeAll([1, 2, 3, 2], [2, 3]); // [1]
 * ```
 */
export function removeAll<T extends readonly unknown[], V extends Iterable<T[number]>>(target: T, values: Values<T, V>): Updated<T>
export function removeAll(target: unknown[], values: Iterable<unknown>): unknown[] {
    const isRemoved = matcher(values)
    if (!isRemoved) return target
    return removeWhere(target, isRemoved)
}
