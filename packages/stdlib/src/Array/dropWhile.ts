import type { Updated } from "../internals/types"

/**
 * # dropWhile
 *
 * Removes elements from the start while they satisfy `predicate`. Returns `target` itself when the
 * first element does not satisfy `predicate`.
 *
 * ## Example
 *
 * ```ts
 * Array.dropWhile([1, 2, 3, 1], x => x < 3); // [3, 1]
 * Array.dropWhile(lines, line => line.trim() === "");
 * ```
 */
export function dropWhile<T extends readonly unknown[]>(target: T, predicate: (value: T[number], index: number, target: T) => boolean): Updated<T>
export function dropWhile(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean): unknown[] {
    let start = 0
    while (start < target.length && predicate(target[start], start, target)) start++
    if (start === 0) return target
    return target.slice(start)
}
