/**
 * # sample
 *
 * Returns a random element, `undefined` when there are none.
 *
 * ## Example
 *
 * ```ts
 * Array.sample([1, 2, 3]); // 2
 * Array.sample([]); // undefined
 * ```
 */
export function sample<T>(target: readonly T[]): T | undefined {
    return target[Math.floor(Math.random() * target.length)]
}
