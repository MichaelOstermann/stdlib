import type { AnySet, SetValue, UpdatedSet } from "../internals/types"

/**
 * # difference
 *
 * ```ts
 * Set.difference(target, values)
 * ```
 *
 * Removes every one of `values` from a copy of `target`. Returns `target` itself when it has none
 * of them. `values` can be any iterable, such as an array or another set.
 *
 * ## Example
 *
 * ```ts
 * Set.difference(new Set([1, 2, 3]), [2, 4]); // Set { 1, 3 }
 *
 * Set.difference(selected, ids);
 * ```
 */
export function difference<T extends AnySet>(target: T, values: Iterable<SetValue<T>>): UpdatedSet<T>
export function difference(target: Set<unknown>, values: Iterable<unknown>): Set<unknown> {
    let result: Set<unknown> | undefined
    for (const value of values) {
        if (target.has(value)) (result ??= new Set(target)).delete(value)
    }
    return result ?? target
}
