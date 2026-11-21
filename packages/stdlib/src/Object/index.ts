import { replica } from "../internals/replica"
import { defaults } from "./defaults"
import { indexBy } from "./indexBy"
import { isPlainObject } from "./isPlainObject"
import { isShallowEqual } from "./isShallowEqual"
import { merge } from "./merge"
import { omit } from "./omit"
import { pick } from "./pick"
import { set } from "./set"
import { setPath } from "./setPath"

/**
 * The native `Object`, with the functions of `@monstermann/stdlib` added: `Object.merge`, …
 *
 * `Object.keys()` and the native members behave as they always do.
 */
export const Object = replica(globalThis.Object, {
    defaults,
    indexBy,
    isPlainObject,
    isShallowEqual,
    merge,
    omit,
    pick,
    set,
    setPath,
})
