import type { Result } from "../Result"
import { Err, Ok } from "../Result"

/**
 * # tryStringify
 *
 * ```ts
 * function JSON.tryStringify(value: unknown): Result<string, Error>
 * ```
 *
 * Turns `value` into JSON like `JSON.stringify`, and returns the error it throws as an `Err`: for a
 * value that refers to itself, or contains a `bigint`.
 *
 * Also fails for values that have no JSON form, where `JSON.stringify` returns `undefined`:
 * `undefined`, a function or a symbol.
 *
 * ## Example
 *
 * ```ts
 * JSON.tryStringify({ a: 1 }); // Ok(`{"a":1}`)
 * JSON.tryStringify({ a: 1n }); // Err(TypeError)
 * JSON.tryStringify(undefined); // Err(TypeError)
 * ```
 */
export function tryStringify(value: unknown): Result<string, Error> {
    try {
        const text = JSON.stringify(value) as string | undefined
        if (text === undefined) return Err(new TypeError("JSON.tryStringify: the value is nothing that can be written as JSON."))
        return Ok(text)
    }
    catch (error) {
        // A `toJSON` or a getter can throw anything.
        return Err(error instanceof Error ? error : new TypeError("JSON.tryStringify: the value can not be written as JSON.", { cause: error }))
    }
}
