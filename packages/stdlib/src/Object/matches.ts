import type { KeysOfUnion } from "../internals/types"

/**
 * The properties of any one member of `T`, each of them optional, and none of the other members.
 */
type ShapeOf<T, Members = T> = T extends unknown
    ? { [K in keyof T]?: T[K] } & { [K in Exclude<KeysOfUnion<Members>, keyof T>]?: never }
    : never

/**
 * # matches
 *
 * Whether each property of `shape` has the same value in `target`, compared with `Object.is`.
 * Narrows `target` to the members of a union that fit `shape`.
 *
 * ## Example
 *
 * ```ts
 * type Input = { type: "click", x: number } | { type: "key", key: string };
 *
 * if (Object.matches(input, { type: "click" })) input.x;
 * if (Object.matches(input, { type: "key", key: "Enter" })) submit();
 *
 * tasks.filter(task => Object.matches(task, { sectionId, done: false }));
 * ```
 */
export function matches<T extends object, const S extends ShapeOf<T>>(target: T, shape: S): target is T & S {
    for (const key in shape) {
        if (!Object.is((target as Record<string, unknown>)[key], shape[key])) return false
    }
    return true
}
