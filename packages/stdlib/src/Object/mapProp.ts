/**
 * # mapProp
 *
 * ```ts
 * Object.mapProp(target, key, map)
 * ```
 *
 * Sets the property `key` of a copy of `target` to what `map` returns for its value. Returns
 * `target` itself when `map` returned the value unchanged.
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
