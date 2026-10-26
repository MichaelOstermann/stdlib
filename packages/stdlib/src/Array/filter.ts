import type { Narrowed, Updated } from "../internals/types"
import { removeWhere } from "../internals/arrays"

/**
 * # filter
 *
 * ```ts
 * Array.filter(target, predicate)
 * ```
 *
 * Keeps the elements that satisfy `predicate`. Returns `target` itself when every element does.
 *
 * ## Example
 *
 * ```ts
 * Array.filter([1, 2, 3], x => x > 1); // [2, 3]
 * Array.filter(tasks, () => true); // tasks
 * ```
 */
export function filter<T extends readonly unknown[], P extends (value: T[number], index: number, target: T) => boolean>(target: T, predicate: P): Updated<T, Narrowed<P, T[number]>>
export function filter(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean): unknown[] {
    return removeWhere(target, (value, index) => !predicate(value, index, target))
}
