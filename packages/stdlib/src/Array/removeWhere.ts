import type { Updated } from "../internals/types"
import { removeWhere as update } from "../internals/arrays"

/**
 * # removeWhere
 *
 * ```ts
 * Array.removeWhere(target, predicate)
 * ```
 *
 * Removes every element that satisfies `predicate`.
 * Returns `target` itself when there is no such element.
 *
 * ## Example
 *
 * ```ts
 * Array.removeWhere([1, 2, 3], x => x > 1); // [1]
 * ```
 */
export function removeWhere<T extends readonly unknown[]>(target: T, predicate: (value: T[number], index: number, target: T) => boolean): Updated<T>
export function removeWhere(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean): unknown[] {
    return update(target, predicate)
}
