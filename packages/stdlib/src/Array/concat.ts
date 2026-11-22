import type { Updated } from "../internals/types"

/**
 * # concat
 *
 * ```ts
 * Array.concat(target, values)
 * ```
 *
 * The elements of `target` followed by those of `values`. Returns `target` itself when `values` is
 * empty, and `values` itself when `target` is.
 *
 * ## Example
 *
 * ```ts
 * Array.concat([1, 2], [3]); // [1, 2, 3]
 * Array.concat(tasks, []) === tasks; // true
 * ```
 */
export function concat<T extends readonly unknown[]>(target: T, values: NoInfer<Updated<T>>): Updated<T>
export function concat(target: readonly unknown[], values: readonly unknown[]): readonly unknown[] {
    if (!values.length) return target
    if (!target.length) return values
    return [...target, ...values]
}
