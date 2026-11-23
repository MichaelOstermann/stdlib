import type { Simplify } from "../types"
import { ownKeys, setOwn } from "./internals"

/**
 * # defaults
 *
 * Copies the properties of `defaults` that are missing or `undefined` in `target` onto a copy of
 * `target`. `null` counts as a value and stays. Returns `target` itself when nothing is missing.
 *
 * Unlike `{ ...defaults, ...target }`, a property that is set to `undefined` does not replace its
 * default.
 *
 * ## Example
 *
 * ```ts
 * Object.defaults({ a: 1, b: undefined }, { b: 2 }); // { a: 1, b: 2 }
 * Object.defaults(options, { retries: 3, timeout: 1000 });
 * ```
 */
export function defaults<T extends object, K extends keyof T>(target: T, source: { [P in K]-?: Exclude<T[P], undefined> }): Simplify<T & { [P in keyof Pick<T, K>]-?: Exclude<T[P], undefined> }>
export function defaults(target: Record<PropertyKey, unknown>, source: Record<PropertyKey, unknown>): object {
    const keys = ownKeys(source)
    for (const key of keys) {
        if (isSet(target, key)) continue
        const result = { ...target }
        for (const key of keys) {
            if (isSet(target, key)) continue
            if (key === "__proto__") setOwn(result, key, source[key])
            else result[key] = source[key]
        }
        return result
    }
    return target
}

/**
 * Only own properties count. `toString` and `__proto__` exist on every object through the
 * prototype, but are still treated as missing.
 */
function isSet(target: Record<PropertyKey, unknown>, key: PropertyKey): boolean {
    return Object.hasOwn(target, key) && target[key] !== undefined
}
