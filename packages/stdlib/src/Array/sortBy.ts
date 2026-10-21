import type { Comparable } from "../internals/arrays"
import type { Updated } from "../internals/types"
import { sortByKeys } from "../internals/arrays"

/**
 * # sortBy
 *
 * ```ts
 * Array.sortBy(target, by, options?)
 * ```
 *
 * Sorts by what `by` returns for each element, compared with `<` and `>`: numbers and dates work, strings are in the order of their characters, see `Array.sortByLocale` for text. Descending with `{ order: "desc" }`.
 *
 * Elements of the same value stay in the order they are in. Returns `target` itself when it is sorted already.
 *
 * ## Example
 *
 * ```ts
 * Array.sortBy(tasks, task => task.dueAt);
 * Array.sortBy(users, user => user.score, { order: "desc" });
 * Array.sortBy([3, 1, 2], value => value); // [1, 2, 3]
 * ```
 */
export function sortBy<T extends readonly unknown[]>(target: T, by: (value: T[number], index: number, target: T) => Comparable, options?: { order?: "asc" | "desc" }): Updated<T>
export function sortBy(target: unknown[], by: (value: unknown, index: number, target: unknown[]) => Comparable, options?: { order?: "asc" | "desc" }): unknown[] {
    return sortByKeys(target, target.map(by), compare, options)
}

function compare(a: Comparable, b: Comparable): number {
    return a < b ? -1 : a > b ? 1 : 0
}
