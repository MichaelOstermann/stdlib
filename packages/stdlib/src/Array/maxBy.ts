import type { Comparable } from "../internals/arrays"

/**
 * # maxBy
 *
 * ```ts
 * Array.maxBy(target, by)
 * ```
 *
 * Returns the element that `by` returns the highest value for, compared with `>`: numbers, strings
 * and dates work. The first one of several, and `undefined` when there are no elements.
 *
 * ## Example
 *
 * ```ts
 * Array.maxBy([{ score: 1 }, { score: 3 }], item => item.score); // { score: 3 }
 *
 * Array.maxBy(users, user => user.score); // The user with the highest score.
 * Array.maxBy([3, 1, 2], value => value); // 3
 * Array.maxBy([], value => value); // undefined
 * ```
 */
export function maxBy<T extends readonly unknown[]>(target: T, by: (value: T[number], index: number, target: T) => Comparable): T[number] | undefined
export function maxBy(target: unknown[], by: (value: unknown, index: number, target: unknown[]) => Comparable): unknown {
    if (!target.length) return undefined
    let result = target[0]
    let best = by(result, 0, target)
    for (let i = 1; i < target.length; i++) {
        const key = by(target[i], i, target)
        if (key > best) {
            best = key
            result = target[i]
        }
    }
    return result
}
