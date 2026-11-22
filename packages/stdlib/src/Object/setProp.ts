/**
 * # setProp
 *
 * Sets the property `key` of a copy of `target` to `value`. Returns `target` itself when `target`
 * already has that value.
 *
 * Unlike `Object.merge(target, { [key]: value })`, `setProp` type-checks a `key` that is only known
 * at runtime.
 *
 * ## Example
 *
 * ```ts
 * Object.setProp(task, "title", "New"); // { ...task, title: "New" }
 * Object.setProp(task, key, value);
 * ```
 */
export function setProp<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): T {
    if (Object.is(target[key], value) && key in target) return target
    // V8 slows `{ ...target, [key]: value }` down a lot once it sees more than one shape, a plain spread copes with up to four:
    const copy = { ...target }
    copy[key] = value
    return copy
}
