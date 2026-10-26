/**
 * # isShallowEqual
 *
 * ```ts
 * Map.isShallowEqual(a, b)
 * ```
 *
 * Whether `a` and `b` have the same entries. Values are compared by identity, not by their
 * contents.
 *
 * ## Example
 *
 * ```ts
 * Map.isShallowEqual(new Map([["a", 1]]), new Map([["a", 1]])); // true
 * ```
 */
export function isShallowEqual<K, V>(a: ReadonlyMap<K, V>, b: ReadonlyMap<NoInfer<K>, NoInfer<V>>): boolean {
    if (a === b) return true
    if (a.size !== b.size) return false
    // With the same size, every entry of one being in the other is enough.
    for (const [key, value] of a) {
        if (!Object.is(b.get(key), value)) return false
        if (value === undefined && !b.has(key)) return false
    }
    return true
}
