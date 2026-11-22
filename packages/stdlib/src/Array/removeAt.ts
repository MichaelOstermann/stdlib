import type { Updated } from "../internals/types"

/**
 * # removeAt
 *
 * Removes the element at `index`, a negative `index` counts from the end. Returns `target` itself
 * when `index` is out of range.
 *
 * ## Example
 *
 * ```ts
 * Array.removeAt([1, 2, 3], 1); // [1, 3]
 * Array.removeAt([1, 2, 3], -1); // [1, 2]
 * ```
 */
export function removeAt<T extends readonly unknown[]>(target: T, index: number): Updated<T>
export function removeAt(target: unknown[], index: number): unknown[] {
    const position = index < 0 ? target.length + index : index
    if (position < 0 || position >= target.length) return target
    return target.toSpliced(position, 1)
}
