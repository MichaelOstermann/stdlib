import type { Updated } from "../internals/types"

/**
 * # shuffle
 *
 * ```ts
 * Array.shuffle(target)
 * ```
 *
 * Puts the elements in a random order.
 *
 * ## Example
 *
 * ```ts
 * Array.shuffle([1, 2, 3]); // [2, 3, 1]
 * ```
 */
export function shuffle<T extends readonly unknown[]>(target: T): Updated<T>
export function shuffle(target: unknown[]): unknown[] {
    const result = [...target]
    for (let i = 0; i < result.length; i++) {
        const random = i + Math.floor(Math.random() * (result.length - i))
        const value = result[random]
        result[random] = result[i]
        result[i] = value
    }
    return result
}
