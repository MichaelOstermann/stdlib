/**
 * # isShallowEqual
 *
 * ```ts
 * Set.isShallowEqual(a, b)
 * ```
 *
 * Whether `a` and `b` have the same values. Values are compared by identity, not by their contents.
 *
 * ## Example
 *
 * ```ts
 * Set.isShallowEqual(new Set([1, 2]), new Set([2, 1])); // true
 * ```
 */
export function isShallowEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<NoInfer<T>>): boolean {
    if (a === b) return true
    if (a.size !== b.size) return false
    // With the same size, every value of one being in the other is enough.
    for (const value of a) {
        if (!b.has(value)) return false
    }
    return true
}
