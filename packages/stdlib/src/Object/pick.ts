import type { DistributedPick, KeysOfUnion } from "type-fest"
import { setOwn } from "../internals/objects"

/**
 * # pick
 *
 * ```ts
 * Object.pick(target, keys)
 * ```
 *
 * Returns a copy of `target` with nothing but the properties `keys`.
 *
 * ## Example
 *
 * ```ts
 * Object.pick({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends object, K extends KeysOfUnion<T>>(target: T, keys: Iterable<K>): DistributedPick<T, K>
export function pick(target: Record<PropertyKey, unknown>, keys: Iterable<PropertyKey>): Record<PropertyKey, unknown> {
    const result: Record<PropertyKey, unknown> = {}
    for (const key of keys) {
        if (!Object.hasOwn(target, key)) continue
        // Assigned, `defineProperty` for every key takes many times as long.
        if (key === "__proto__") setOwn(result, key, target[key])
        else result[key] = target[key]
    }
    return result
}
