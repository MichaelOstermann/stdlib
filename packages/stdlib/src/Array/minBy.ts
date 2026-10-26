import type { Comparable } from "../internals/arrays"

/**
 * # minBy
 *
 * ```ts
 * Array.minBy(target, by)
 * ```
 *
 * Returns the element that `by` returns the lowest value for, compared with `<`: numbers, strings
 * and dates work. The first one of several, and `undefined` when there are no elements.
 *
 * ## Example
 *
 * ```ts
 * Array.minBy([{ score: 1 }, { score: 3 }], item => item.score); // { score: 1 }
 *
 * Array.minBy(tasks, task => task.dueAt); // The task that is due first.
 * Array.minBy([3, 1, 2], value => value); // 1
 * Array.minBy([], value => value); // undefined
 * ```
 */
export function minBy<T extends readonly unknown[]>(target: T, by: (value: T[number], index: number, target: T) => Comparable): T[number] | undefined
export function minBy(target: unknown[], by: (value: unknown, index: number, target: unknown[]) => Comparable): unknown {
    if (!target.length) return undefined
    let result = target[0]
    let best = by(result, 0, target)
    for (let i = 1; i < target.length; i++) {
        const key = by(target[i], i, target)
        if (key < best) {
            best = key
            result = target[i]
        }
    }
    return result
}
