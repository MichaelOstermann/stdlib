import type { Updated } from "../internals/types"
import { indexWhere, setAt } from "../internals/arrays"

/**
 * # replaceFirstWhere
 *
 * ```ts
 * Array.replaceFirstWhere(target, predicate, replacement)
 * ```
 *
 * Replaces the first element that satisfies `predicate` with `replacement`. Returns `target` itself
 * when there is no such element, or when it is `replacement` already.
 *
 * ## Example
 *
 * ```ts
 * Array.replaceFirstWhere([1, 2, 3], x => x > 1, 0); // [1, 0, 3]
 *
 * Array.replaceFirstWhere(tasks, task => task.id === id, updated);
 * ```
 */
export function replaceFirstWhere<T extends readonly unknown[]>(target: T, predicate: (value: T[number], index: number, target: T) => boolean, replacement: T[number]): Updated<T>
export function replaceFirstWhere(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean, replacement: unknown): unknown[] {
    return setAt(target, indexWhere(target, predicate, false), replacement)
}
