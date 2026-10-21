import type { Narrowed, Updated } from "../internals/types"
import { mapWhere as update } from "../internals/arrays"

/**
 * # mapWhere
 *
 * ```ts
 * Array.mapWhere(target, predicate, map)
 * ```
 *
 * Applies `map` to every element that satisfies `predicate`.
 * Returns `target` itself when there is no such element, or when `map` returned every element unchanged.
 *
 * ## Example
 *
 * ```ts
 * Array.mapWhere([1, 2, 3], x => x > 1, x => x * 10); // [1, 20, 30]
 *
 * Array.mapWhere(tasks, task => ids.has(task.id), task => ({ ...task, done: true }));
 * ```
 */
export function mapWhere<T extends readonly unknown[], P extends (value: T[number], index: number, target: T) => boolean>(target: T, predicate: P, map: (value: Narrowed<P, T[number]>, index: number, target: T) => T[number]): Updated<T>
export function mapWhere(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean, map: (value: unknown, index: number, target: unknown[]) => unknown): unknown[] {
    return update(target, predicate, map)
}
