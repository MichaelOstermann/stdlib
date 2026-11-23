import type { AnySet, SetValue, UpdatedSet } from "./internals"

/**
 * # delete
 *
 * Removes `value` from a copy of `target`. Returns `target` itself when `target` does not have
 * `value`.
 *
 * ## Example
 *
 * ```ts
 * Set.delete(new Set([1, 2]), 2); // Set { 1 }
 *
 * Set.delete(selected, id);
 * ```
 */
function _delete<T extends AnySet>(target: T, value: SetValue<T>): UpdatedSet<T>
function _delete(target: Set<unknown>, value: unknown): Set<unknown> {
    if (!target.has(value)) return target
    const result = new Set(target)
    result.delete(value)
    return result
}

export { _delete as delete }
