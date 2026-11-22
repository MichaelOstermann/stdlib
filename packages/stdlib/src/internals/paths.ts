/** The keys that a path can continue with in `T`: keys of objects, not of arrays. */
type Key<T> = [T] extends [readonly unknown[]] ? never : [T] extends [object] ? keyof T & string : never

/** `P` when `P` is a path through `T`, with keys separated by dots. Otherwise, the valid paths. */
export type PathOf<T, P extends string, Done extends string = ""> =
    P extends `${infer Head}.${infer Rest}`
        ? Head extends Key<T>
            ? PathOf<T[Head], Rest, `${Done}${Head}.`>
            : `${Done}${Key<T>}`
        : P extends Key<T>
            ? `${Done}${P}`
            : `${Done}${Key<T>}`

/** The value at the path `P` through `T`. */
export type ValueAt<T, P extends string> =
    P extends `${infer Head}.${infer Rest}`
        ? Head extends Key<T>
            ? ValueAt<T[Head], Rest>
            : never
        : P extends Key<T>
            ? T[P]
            : never

/** Returns the value at `keys` in `target`. */
export function readPath(target: any, keys: string[]): unknown {
    let node = target
    for (const key of keys) node = node[key]
    return node
}

/** Returns a copy of `target` with `value` at `keys`. Each object on the way is copied. */
export function writePath(target: any, keys: string[], value: unknown, index = 0): any {
    // Not { ...target, [key]: value }, which V8 slows down a lot once it sees more than one shape.
    const result = { ...target }
    const key = keys[index]!
    result[key] = index === keys.length - 1 ? value : writePath(target[key], keys, value, index + 1)
    return result
}
