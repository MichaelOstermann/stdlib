import type { KeysOfUnion } from "../internals/types"

/** The value of `K` in each member of `T` that has it, `undefined` for the others. */
type PropOf<T, K extends PropertyKey> = T extends unknown ? K extends keyof T ? T[K] : undefined : never

/**
 * # prop
 *
 * Reads the property `key` of `target`. Where `target` is a union, `key` may be one of any of its
 * members, and the value is `undefined` for those that do not have it: unlike `key in target`, a
 * misspelled `key` is an error.
 *
 * ## Example
 *
 * ```ts
 * type Input = { type: "click", x: number } | { type: "key", key: string };
 *
 * Object.prop(input, "x"); // number | undefined
 * Object.prop(input, "y"); // error
 * ```
 */
export function prop<T extends object, K extends KeysOfUnion<T>>(target: T, key: K): PropOf<T, K> {
    return (target as Record<PropertyKey, unknown>)[key] as PropOf<T, K>
}
