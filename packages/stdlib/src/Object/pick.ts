/**
 * # pick
 *
 * Returns a copy of `target` with only the properties `keys`, in the order of `keys`.
 *
 * ## Example
 *
 * ```ts
 * Object.pick({ a: 1, b: 2, c: 3 }, ["c", "a"]); // { c: 3, a: 1 }
 * ```
 */
export function pick<T extends object, K extends keyof T>(target: T, keys: Iterable<K>): Pick<T, K>
export function pick(target: Record<PropertyKey, unknown>, keys: Iterable<PropertyKey>): Record<PropertyKey, unknown> {
    const result: Record<PropertyKey, unknown> = {}
    for (const key of keys) {
        // Assigning `__proto__` would set the prototype instead.
        if (key === "__proto__") Object.defineProperty(result, key, { configurable: true, enumerable: true, value: target[key], writable: true })
        if (key !== "__proto__") result[key] = target[key]
    }
    return result
}
