/**
 * # isPlainObject
 *
 * Whether `value` is an object written as `{ … }`, or made with `Object.create(null)`. Arrays,
 * class instances, `Date`, `Map` and errors are not.
 *
 * ## Example
 *
 * ```ts
 * Object.isPlainObject({ a: 1 }); // true
 * Object.isPlainObject(new Date()); // false
 * Object.isPlainObject([]); // false
 * ```
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null) return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}
