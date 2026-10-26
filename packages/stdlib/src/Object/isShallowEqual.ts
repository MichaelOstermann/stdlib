/**
 * # isShallowEqual
 *
 * ```ts
 * Object.isShallowEqual(a, b)
 * ```
 *
 * Whether `a` and `b` have the same properties, with the same values. Values are compared by
 * identity, not by their contents.
 *
 * ## Example
 *
 * ```ts
 * Object.isShallowEqual({ a: 1 }, { a: 1 }); // true
 * Object.isShallowEqual({ a: 1 }, { a: 1, b: 2 }); // false
 * ```
 */
export function isShallowEqual<T extends object>(a: T, b: NoInfer<T>): boolean {
    if (a === b) return true
    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) return false
    for (const key of keys) {
        if (!Object.hasOwn(b, key)) return false
        if (!Object.is(a[key as keyof T], b[key as keyof T])) return false
    }
    return true
}
