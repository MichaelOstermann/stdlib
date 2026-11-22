import type { PathOf, ValueAt } from "../internals/paths"
import { readPath, writePath } from "../internals/paths"

/**
 * # mapPath
 *
 * ```ts
 * Object.mapPath(target, path, map)
 * ```
 *
 * Sets the property at `path`, keys separated by dots, of a copy of `target` to what `map` returns
 * for its value, copying each object on the way. Returns `target` itself when `map` returned the
 * value unchanged.
 *
 * A path only goes through objects that are always there. Not through an optional one, which would
 * have to be made up when it is missing, nor through an array.
 *
 * ## Example
 *
 * ```ts
 * Object.mapPath(state, "user.settings.fontSize", size => size + 1);
 * ```
 *
 * With `stdlib-transform`, a path that is written out is compiled into a function of its own, which
 * reads and copies each level directly.
 */
export function mapPath<T extends object, P extends string>(target: T, path: PathOf<T, P>, map: (value: ValueAt<T, P>) => ValueAt<T, P>): T {
    const keys = path.split(".")
    const current = readPath(target, keys)
    const value = map(current as ValueAt<T, P>)
    if (Object.is(current, value)) return target
    return writePath(target, keys, value)
}
