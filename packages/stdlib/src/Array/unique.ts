import type { Updated } from "../internals/types"

/**
 * # unique
 *
 * ```ts
 * Array.unique(target)
 * ```
 *
 * Removes what occurs more than once, the first occurrence stays. Returns `target` itself when
 * there are no duplicates.
 *
 * ## Example
 *
 * ```ts
 * Array.unique([1, 2, 1, 3, 2]); // [1, 2, 3]
 * ```
 */
export function unique<T extends readonly unknown[]>(target: T): Updated<T>
export function unique(target: unknown[]): unknown[] {
    const values = new Set(target)
    if (values.size === target.length) return target
    return [...values]
}
