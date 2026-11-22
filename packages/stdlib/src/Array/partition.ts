import type { Excluded, Narrowed } from "../internals/types"

/**
 * # partition
 *
 * Returns two arrays: the elements that satisfy `predicate`, and the elements that do not.
 *
 * ## Example
 *
 * ```ts
 * Array.partition([1, 2, 3, 4], x => x % 2 === 0); // [[2, 4], [1, 3]]
 * ```
 */
export function partition<T extends readonly unknown[], P extends (value: T[number], index: number, target: T) => boolean>(target: T, predicate: P): [Narrowed<P, T[number]>[], Excluded<P, T[number]>[]]
export function partition(target: unknown[], predicate: (value: unknown, index: number, target: unknown[]) => boolean): [unknown[], unknown[]] {
    const matched: unknown[] = []
    const rest: unknown[] = []
    for (let i = 0; i < target.length; i++) {
        const value = target[i]
        if (predicate(value, i, target)) matched.push(value)
        else rest.push(value)
    }
    return [matched, rest]
}
