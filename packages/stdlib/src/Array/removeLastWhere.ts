import type { Updated } from "../internals/types"
import { indexWhere, removeAt } from "../internals/arrays"

/**
 * # removeLastWhere
 *
 * ```ts
 * Array.removeLastWhere(target, predicate)
 * ```
 *
 * Removes the last element that satisfies `predicate`. Returns `target` itself when there is no
 * such element.
 *
 * ## Example
 *
 * ```ts
 * Array.removeLastWhere([1, 2, 3], x => x > 1); // [1, 2]
 *
 * Array.removeLastWhere(tasks, task => task.id === id);
 * ```
 */
export function removeLastWhere<T extends readonly unknown[]>(target: T, predicate: (value: T[number], index: number, target: T) => boolean): Updated<T>
export function removeLastWhere(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean): unknown[] {
    return removeAt(target, indexWhere(target, predicate, true))
}
