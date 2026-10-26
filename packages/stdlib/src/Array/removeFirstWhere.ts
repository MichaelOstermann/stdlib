import type { Updated } from "../internals/types"
import { indexWhere, removeAt } from "../internals/arrays"

/**
 * # removeFirstWhere
 *
 * ```ts
 * Array.removeFirstWhere(target, predicate)
 * ```
 *
 * Removes the first element that satisfies `predicate`. Returns `target` itself when there is no
 * such element.
 *
 * ## Example
 *
 * ```ts
 * Array.removeFirstWhere([1, 2, 3], x => x > 1); // [1, 3]
 *
 * Array.removeFirstWhere(tasks, task => task.id === id);
 * ```
 */
export function removeFirstWhere<T extends readonly unknown[]>(target: T, predicate: (value: T[number], index: number, target: T) => boolean): Updated<T>
export function removeFirstWhere(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean): unknown[] {
    return removeAt(target, indexWhere(target, predicate, false))
}
