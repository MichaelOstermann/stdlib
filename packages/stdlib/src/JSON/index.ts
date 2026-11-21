import { replica } from "../internals/replica"
import { safeStringify } from "./safeStringify"
import { tryParse } from "./tryParse"
import { tryStringify } from "./tryStringify"

/**
 * The native `JSON`, with the functions of `@monstermann/stdlib` added: `JSON.tryParse`, …
 *
 * `JSON.parse()` and `JSON.stringify()` behave as they always do.
 */
export const JSON = replica(globalThis.JSON, {
    safeStringify,
    tryParse,
    tryStringify,
})

/**
 * Anything `JSON.stringify` turns into the same value `JSON.parse` gives back. Objects have to be
 * declared with `type`, an `interface` is not accepted.
 */
export type JSON = boolean | JSON.Object | JSON[] | number | readonly JSON[] | string | null

export namespace JSON {
    /** An object whose values are all `JSON`. */
    export type Object = { [key: string]: JSON }
}
