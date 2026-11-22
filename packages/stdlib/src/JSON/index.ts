import type { Failure } from "../Failure"
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
 * Any value that survives `JSON.stringify` and `JSON.parse` unchanged. Objects have to be declared
 * with `type`. An `interface` is not accepted.
 */
export type JSON = boolean | JSON.Object | JSON[] | number | readonly JSON[] | string | null

export namespace JSON {
    /** The error of `JSON.tryParse` and `JSON.tryStringify`. `cause` is what was thrown. */
    export type Error = { cause?: Failure, message: string, name: "JSONError" }

    /** An object whose values are all `JSON`. */
    export type Object = { [key: string]: JSON }
}
