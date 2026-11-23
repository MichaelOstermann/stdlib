import type { Comparable, Updated } from "./internals"
import { sortByKeys } from "./internals"

/**
 * # sortBy
 *
 * Sorts by what `by` returns for each element, compared with `<` and `>`. Numbers and dates work.
 * Strings sort by character code. For text, see `Array.sortByLocale`. Descending with
 * `{ order: "desc" }`.
 *
 * Elements with the same value keep their order. Returns `target` itself when `target` is already
 * sorted.
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
