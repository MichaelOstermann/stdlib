import type { AnyMap, MapKey, MapValue, UpdatedMap } from "./internals"

/**
 * # set
 *
 * Sets the entry of `key` to `value` in a copy of `target`. Returns `target` itself when `target`
 * already has that entry.
 *
 * ## Example
 *
 * ```ts
 * Map.set(new Map([["a", 1]]), "b", 2); // Map { "a" => 1, "b" => 2 }
 *
 * Map.set(cache, "a", task);
 * ```
 */
export function set<T extends AnyMap>(target: T, key: MapKey<T>, value: MapValue<T>): UpdatedMap<T>
export function set(target: Map<unknown, unknown>, key: unknown, value: unknown): Map<unknown, unknown> {
    if (Object.is(target.get(key), value) && (value !== undefined || target.has(key))) return target
    return new Map(target).set(key, value)
}
