/**
 * # isShallowEqual
 *
 * ```ts
 * Array.isShallowEqual(a, b)
 * ```
 *
 * Whether `a` and `b` have the same elements, in the same order.
 * Elements are compared by identity, not by their contents.
 *
 * ## Example
 *
 * ```ts
 * Array.isShallowEqual([1, 2], [1, 2]); // true
 * Array.isShallowEqual([1, 2], [2, 1]); // false
 * ```
 */
export function isShallowEqual<T>(a: readonly T[], b: readonly NoInfer<T>[]): boolean {
    if (a === b) return true
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (!Object.is(a[i], b[i])) return false
    }
    return true
}
