import { replica } from "../internals/replica"
import { delete as _delete } from "./delete"
import { isShallowEqual } from "./isShallowEqual"
import { set } from "./set"

/**
 * The native `Map`, with the functions of `@monstermann/stdlib` added: `Map.set`, …
 *
 * `new Map()`, `instanceof Map` and the native members behave as they always do.
 */
export const Map = replica(globalThis.Map, {
    delete: _delete,
    isShallowEqual,
    set,
})
