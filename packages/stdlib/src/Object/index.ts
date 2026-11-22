import { replica } from "../internals/replica"
import { defaults } from "./defaults"
import { indexBy } from "./indexBy"
import { isPlainObject } from "./isPlainObject"
import { isShallowEqual } from "./isShallowEqual"
import { mapPath } from "./mapPath"
import { mapProp } from "./mapProp"
import { matches } from "./matches"
import { merge } from "./merge"
import { omit } from "./omit"
import { pick } from "./pick"
import { prop } from "./prop"
import { setPath } from "./setPath"
import { setProp } from "./setProp"

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
    mapPath,
    mapProp,
    matches,
    merge,
    omit,
    pick,
    prop,
    setPath,
    setProp,
})
