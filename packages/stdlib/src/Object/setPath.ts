type Key<T> = [T] extends [readonly unknown[]] ? never : [T] extends [object] ? keyof T & string : never

type PathOf<T, P extends string, Done extends string = ""> =
    P extends `${infer Head}.${infer Rest}`
        ? Head extends Key<T> ? PathOf<T[Head], Rest, `${Done}${Head}.`> : `${Done}${Key<T>}`
        : P extends Key<T> ? `${Done}${P}` : `${Done}${Key<T>}`

type ValueAt<T, P extends string> =
    P extends `${infer Head}.${infer Rest}`
        ? Head extends Key<T> ? ValueAt<T[Head], Rest> : never
        : P extends Key<T> ? T[P] : never

/**
 * # setPath
 *
 * ```ts
 * Object.setPath(target, path, value)
 * ```
 *
 * Sets the property at `path`, keys separated by dots, of a copy of `target` to `value`, copying
 * each object on the way. Returns `target` itself when it has that value already.
 *
 * A path only goes through objects that are always there. Not through an optional one, which would
 * have to be made up when it is missing, nor through an array.
 *
 * ## Example
 *
 * ```ts
 * Object.setPath(state, "user.settings.theme", "dark");
 * ```
 *
 * With `stdlib-transform`, a path that is written out is compiled into a function of its own, which
 * reads and copies each level directly.
 */
export function setPath<T extends object, P extends string>(target: T, path: PathOf<T, P>, value: NoInfer<ValueAt<T, P>>): T {
    const keys = path.split(".")
    const last = keys.length - 1
    // Reads down to the value first, and only copies once it differs: most calls change nothing.
    let node: any = target
    for (let i = 0; i < last; i++) node = node[keys[i]!]
    const key = keys[last]!
    if (Object.is(node[key], value) && key in node) return target
    return copy(target, keys, value, 0)
}

function copy(target: any, keys: string[], value: unknown, index: number): any {
    // Not { ...target, [key]: value }, which V8 slows down a lot once it sees more than one shape.
    const result = { ...target }
    const key = keys[index]!
    result[key] = index === keys.length - 1 ? value : copy(target[key], keys, value, index + 1)
    return result
}
