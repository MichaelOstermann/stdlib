import { isSame } from "../internals/isSame"
import { ownKeys, setOwn } from "../internals/objects"

/**
 * # merge
 *
 * ```ts
 * Object.merge(target, source)
 * ```
 *
 * Copies the properties of `source` onto a copy of `target`.
 * Returns `target` itself when every property has that value already.
 *
 * ## Example
 *
 * ```ts
 * Object.merge(task, { title: "New" }); // { ...task, title: "New" }
 * Object.merge(task, { title: task.title }); // task
 * ```
 */
export function merge<T extends object>(target: T, source: Partial<NoInfer<T>>): T {
    const keys = ownKeys(source) as (keyof T)[]
    for (const key of keys) {
        if (isSame(target[key], source[key]) && key in target) continue
        // Not { ...target, ...source }, which takes twice as long.
        const result = { ...target }
        for (const key of keys) {
            if (key === "__proto__") setOwn(result, key, source[key])
            else result[key] = source[key] as T[keyof T]
        }
        return result
    }
    return target
}
