import type { KeysOfUnion } from "./internals"

/**
 * # omit
 *
 * Returns a copy of `target` without the properties `keys`. Returns `target` itself when `target`
 * has none of them.
 *
 * ## Example
 *
 * ```ts
 * Object.omit({ a: 1, b: 2, c: 3 }, ["b"]); // { a: 1, c: 3 }
 * ```
 */
export function omit<T extends object, K extends KeysOfUnion<T>>(target: T, keys: Iterable<K>): T extends unknown ? Omit<T, K> : never
export function omit(target: Record<PropertyKey, unknown>, keys: Iterable<PropertyKey>): Record<PropertyKey, unknown> {
    let result: Record<PropertyKey, unknown> | undefined
    for (const key of keys) {
        if (!Object.hasOwn(target, key)) continue
        result ??= { ...target }
        delete result[key]
    }
    return result ?? target
}
