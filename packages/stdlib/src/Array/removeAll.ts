import type { Updated, Values } from "../internals/types"
import { matcher, removeWhere } from "../internals/arrays"

/**
 * # removeAll
 *
 * ```ts
 * Array.removeAll(target, values)
 * ```
 *
 * Removes every occurrence of each of `values`. Returns `target` itself when none of them occurs.
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
