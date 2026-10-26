import type { AnyMap, MapKey, UpdatedMap } from "../internals/types"

/**
 * # delete
 *
 * ```ts
 * Map.delete(target, key)
 * ```
 *
 * Removes the entry of `key`, from a copy of `target`. Returns `target` itself when there is no
 * such entry.
 *
 * ## Example
 *
 * ```ts
 * Map.delete(new Map([["a", 1], ["b", 2]]), "a"); // Map { "b" => 2 }
 *
 * Map.delete(cache, "a");
 * ```
 */
function _delete<T extends AnyMap>(target: T, key: MapKey<T>): UpdatedMap<T>
function _delete(target: Map<unknown, unknown>, key: unknown): Map<unknown, unknown> {
    if (!target.has(key)) return target
    const result = new Map(target)
    result.delete(key)
    return result
}

export { _delete as delete }
