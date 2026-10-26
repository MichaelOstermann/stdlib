import type { DistributedOmit, KeysOfUnion } from "type-fest"

/**
 * # omit
 *
 * ```ts
 * Object.omit(target, keys)
 * ```
 *
 * Returns a copy of `target` without the properties `keys`. Returns `target` itself when it has
 * none of them.
 *
 * ## Example
 *
 * ```ts
 * Object.omit({ a: 1, b: 2, c: 3 }, ["b"]); // { a: 1, c: 3 }
 * ```
 */
export function omit<T extends object, K extends KeysOfUnion<T>>(target: T, keys: Iterable<K>): DistributedOmit<T, K>
export function omit(target: Record<PropertyKey, unknown>, keys: Iterable<PropertyKey>): Record<PropertyKey, unknown> {
    let result: Record<PropertyKey, unknown> | undefined
    for (const key of keys) {
        if (!Object.hasOwn(target, key)) continue
        result ??= { ...target }
        delete result[key]
    }
    return result ?? target
}
