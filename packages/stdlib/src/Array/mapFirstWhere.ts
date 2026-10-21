import type { Narrowed, Updated } from "../internals/types"
import { indexWhere, setAt } from "../internals/arrays"

/**
 * # mapFirstWhere
 *
 * ```ts
 * Array.mapFirstWhere(target, predicate, map)
 * ```
 *
 * Applies `map` to the first element that satisfies `predicate`.
 * Returns `target` itself when there is no such element, or when `map` returned the element unchanged.
 *
 * ## Example
 *
 * ```ts
 * Array.mapFirstWhere([1, 2, 3], x => x > 1, x => x * 10); // [1, 20, 3]
 *
 * Array.mapFirstWhere(tasks, task => task.id === id, task => ({ ...task, title }));
 * ```
 */
export function mapFirstWhere<T extends readonly unknown[], P extends (value: T[number], index: number, target: T) => boolean>(target: T, predicate: P, map: (value: Narrowed<P, T[number]>, index: number, target: T) => T[number]): Updated<T>
export function mapFirstWhere(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean, map: (value: unknown, index: number, target: unknown[]) => unknown): unknown[] {
    const index = indexWhere(target, predicate, false)
    if (index === -1) return target
    return setAt(target, index, map(target[index], index, target))
}
