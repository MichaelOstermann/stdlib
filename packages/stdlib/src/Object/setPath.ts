import type { PathOf, ValueAt } from "./internals"
import { readPath, writePath } from "./internals"

/**
 * # setPath
 *
 * Sets the property at `path` in a copy of `target` to `value`. `path` separates keys with dots.
 * Each object on the way is copied. Returns `target` itself when `target` already has that value.
 *
 * A path only goes through objects that always exist. It cannot go through an optional object,
 * because a missing object would have to be made up. It cannot go through an array either.
 *
 * ## Example
 *
 * ```ts
 * Object.setPath(state, "user.settings.theme", "dark");
 * ```
 *
 * With `stdlib-transform`, a written-out path is compiled into a function of its own. That function
 * reads and copies each level directly.
 */
export function setPath<T extends object, P extends string>(target: T, path: PathOf<T, P>, value: NoInfer<ValueAt<T, P>>): T {
    const keys = path.split(".")
    // Reads down to the value first, and only copies once it differs: most calls change nothing.
    if (Object.is(readPath(target, keys), value)) return target
    return writePath(target, keys, value)
}
