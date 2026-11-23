import type { Updated } from "./internals"
import { indexWhere, setAt } from "./internals"

/**
 * # replaceLastWhere
 *
 * Replaces the last element that satisfies `predicate` with `replacement`. Returns `target` itself
 * when there is no such element, or when the element already is `replacement`.
 *
 * ## Example
 *
 * ```ts
 * Array.replaceLastWhere([1, 2, 3], x => x > 1, 0); // [1, 2, 0]
 *
 * Array.replaceLastWhere(tasks, task => task.id === id, updated);
 * ```
 */
export function replaceLastWhere<T extends readonly unknown[]>(target: T, predicate: (value: T[number], index: number, target: T) => boolean, replacement: T[number]): Updated<T>
export function replaceLastWhere(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean, replacement: unknown): unknown[] {
    return setAt(target, indexWhere(target, predicate, true), replacement)
}
