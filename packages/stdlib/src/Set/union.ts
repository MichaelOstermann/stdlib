import type { AnySet, SetValue, UpdatedSet } from "../internals/types"

/**
 * # union
 *
 * ```ts
 * Set.union(target, values)
 * ```
 *
 * Adds every one of `values` to a copy of `target`. Returns `target` itself when it has all of them
 * already. `values` can be any iterable, such as an array or another set.
 *
 * ## Example
 *
 * ```ts
 * Set.union(new Set([1, 2]), [2, 3]); // Set { 1, 2, 3 }
 *
 * Set.union(selected, ids);
 * ```
 */
export function union<T extends AnySet>(target: T, values: Iterable<SetValue<T>>): UpdatedSet<T>
export function union(target: Set<unknown>, values: Iterable<unknown>): Set<unknown> {
    let result: Set<unknown> | undefined
    for (const value of values) {
        if (!target.has(value)) (result ??= new Set(target)).add(value)
    }
    return result ?? target
}
