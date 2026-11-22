/**
 * # mapProp
 *
 * Maps the property `key` in a copy of `target`. `map` gets the current value and returns the new
 * value. Returns `target` itself when `map` returns the value unchanged.
 *
 * ## Example
 *
 * ```ts
 * Object.mapProp(task, "title", title => title.trim());
 * Object.mapProp(tasks, id, task => ({ ...task, sectionId }));
 * ```
 */
export function mapProp<T extends object, K extends keyof T>(target: T, key: K, map: (value: T[K]) => T[K]): T {
    const value = map(target[key])
    if (Object.is(target[key], value) && key in target) return target
    // V8 slows `{ ...target, [key]: value }` down a lot once it sees more than one shape, a plain spread copes with up to four:
    const copy = { ...target }
    copy[key] = value
    return copy
}
