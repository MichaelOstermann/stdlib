import type { Narrowed, Updated } from "./internals"

/**
 * # takeWhile
 *
 * Returns the elements from the start while they satisfy `predicate`. Returns `target` itself when
 * every element satisfies `predicate`.
 *
 * ## Example
 *
 * ```ts
 * Array.takeWhile([1, 2, 3, 1], x => x < 3); // [1, 2]
 * Array.takeWhile(lines, line => line.startsWith("#"));
 * ```
 */
export function takeWhile<T extends readonly unknown[], P extends (value: T[number], index: number, target: T) => boolean>(target: T, predicate: P): Updated<T, Narrowed<P, T[number]>>
export function takeWhile(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean): unknown[] {
    let end = 0
    while (end < target.length && predicate(target[end], end, target)) end++
    if (end === target.length) return target
    return target.slice(0, end)
}
