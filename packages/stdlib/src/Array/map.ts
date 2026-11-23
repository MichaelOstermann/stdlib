import type { Updated } from "./internals"
import { mapWhere } from "./internals"

/**
 * # map
 *
 * Applies `map` to every element. Returns `target` itself when no element changed.
 *
 * ## Example
 *
 * ```ts
 * Array.map([1, 2], x => x * 2); // [2, 4]
 * Array.map(tasks, task => task); // tasks
 * ```
 */
export function map<T extends readonly unknown[], U>(target: T, map: (value: T[number], index: number, target: T) => U): Updated<T, U>
export function map(target: unknown[], map: (value: unknown, index: number, target: unknown[]) => unknown): unknown[] {
    return mapWhere(target, undefined, map)
}
