import { replica } from "../internals/replica"
import { add } from "./add"
import { delete as _delete } from "./delete"
import { difference } from "./difference"
import { isShallowEqual } from "./isShallowEqual"
import { union } from "./union"

/**
 * The native `Set`, with the functions of `@monstermann/stdlib` added: `Set.union`, `Set.add`, …
 *
 * `new Set()`, `instanceof Set` and the native members behave as they always do.
 */
export const Set = replica(globalThis.Set, {
    add,
    delete: _delete,
    difference,
    isShallowEqual,
    union,
})
