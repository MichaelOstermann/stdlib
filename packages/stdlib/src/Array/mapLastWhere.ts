import type { Narrowed, Updated } from "../internals/types"
import { indexWhere, setAt } from "../internals/arrays"

/**
 * # mapLastWhere
 *
 * ```ts
 * Array.mapLastWhere(target, predicate, map)
 * ```
 *
 * Applies `map` to the last element that satisfies `predicate`.
 * Returns `target` itself when there is no such element, or when `map` returned the element unchanged.
 *
 * ## Example
 *
 * ```ts
 * Array.mapLastWhere([1, 2, 3], x => x > 1, x => x * 10); // [1, 2, 30]
 *
 * Array.mapLastWhere(tasks, task => task.id === id, task => ({ ...task, title }));
 * ```
 */
export function mapLastWhere<T extends readonly unknown[], P extends (value: T[number], index: number, target: T) => boolean>(target: T, predicate: P, map: (value: Narrowed<P, T[number]>, index: number, target: T) => T[number]): Updated<T>
export function mapLastWhere(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean, map: (value: unknown, index: number, target: unknown[]) => unknown): unknown[] {
    const index = indexWhere(target, predicate, true)
    if (index === -1) return target
    return setAt(target, index, map(target[index], index, target))
}
