import type { AnySet, SetValue, UpdatedSet } from "../internals/types"

/**
 * # add
 *
 * ```ts
 * Set.add(target, value)
 * ```
 *
 * Adds `value` to a copy of `target`. Returns `target` itself when it has that value already.
 *
 * ## Example
 *
 * ```ts
 * Set.add(new Set([1, 2]), 3); // Set { 1, 2, 3 }
 *
 * Set.add(selected, id);
 * ```
 */
export function add<T extends AnySet>(target: T, value: SetValue<T>): UpdatedSet<T>
export function add(target: Set<unknown>, value: unknown): Set<unknown> {
    if (target.has(value)) return target
    return new Set(target).add(value)
}
