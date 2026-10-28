import { setOwn } from "../internals/objects"

/**
 * # merge
 *
 * ```ts
 * Object.merge(target, source)
 * ```
 *
 * Copies the properties of `source` onto a copy of `target`. Returns `target` itself when every
 * property has that value already.
 *
 * ## Example
 *
 * ```ts
 * Object.merge(task, { title: "New" }); // { ...task, title: "New" }
 * Object.merge(task, { title: task.title }); // task
 * ```
 *
 * With `stdlib-transform`, an object literal is compiled into a function of its own, which compares
 * and copies each property directly, without creating the object.
 */
export function merge<T extends object>(target: T, source: Partial<NoInfer<T>>): T
export function merge(target: Record<PropertyKey, unknown>, source: Record<PropertyKey, unknown>): Record<PropertyKey, unknown> {
    // for...in instead of Object.keys: no array of keys on every call.
    for (const key in source) {
        if (!Object.is(target[key], source[key])) return copy(target, source)
    }
    for (const symbol of Object.getOwnPropertySymbols(source)) {
        if (!Object.is(target[symbol], source[symbol]) && Object.prototype.propertyIsEnumerable.call(source, symbol)) return copy(target, source)
    }
    return target
}

function copy(target: Record<PropertyKey, unknown>, source: Record<PropertyKey, unknown>): Record<PropertyKey, unknown> {
    // Not { ...target, ...source }: faster in V8, but twice as slow in JavaScriptCore.
    const result = { ...target }
    for (const key in source) {
        if (key === "__proto__") setOwn(result, key, source[key])
        else result[key] = source[key]
    }
    for (const symbol of Object.getOwnPropertySymbols(source)) {
        if (Object.prototype.propertyIsEnumerable.call(source, symbol)) result[symbol] = source[symbol]
    }
    return result
}
