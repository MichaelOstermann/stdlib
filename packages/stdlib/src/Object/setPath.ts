import type { PathOf, ValueAt } from "../internals/paths"
import { readPath, writePath } from "../internals/paths"

/**
 * # setPath
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
    // Reads down to the value first, and only copies once it differs: most calls change nothing.
    if (Object.is(readPath(target, keys), value)) return target
    return writePath(target, keys, value)
}
