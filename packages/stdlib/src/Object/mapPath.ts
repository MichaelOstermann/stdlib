import type { PathOf, ValueAt } from "../internals/paths"
import { readPath, writePath } from "../internals/paths"

/**
 * # mapPath
 *
 * Maps the property at `path` in a copy of `target`. `path` separates keys with dots. `map` gets
 * the current value and returns the new value. Each object on the way is copied. Returns `target`
 * itself when `map` returns the value unchanged.
 *
 * A path only goes through objects that always exist. It cannot go through an optional object,
 * because a missing object would have to be made up. It cannot go through an array either.
 *
 * ## Example
 *
 * ```ts
 * Object.mapPath(state, "user.settings.fontSize", size => size + 1);
 * ```
 *
 * With `stdlib-transform`, a written-out path is compiled into a function of its own. That function
 * reads and copies each level directly.
 */
export function mapPath<T extends object, P extends string>(target: T, path: PathOf<T, P>, map: (value: ValueAt<T, P>) => ValueAt<T, P>): T {
    const keys = path.split(".")
    const current = readPath(target, keys)
    const value = map(current as ValueAt<T, P>)
    if (Object.is(current, value)) return target
    return writePath(target, keys, value)
}
