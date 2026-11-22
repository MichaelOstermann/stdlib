import type { JSON } from "."
import type { Result } from "../Result"
import { Failure } from "../Failure"
import { Err, Ok } from "../Result"

/**
 * # tryStringify
 *
 * ```ts
 * function JSON.tryStringify(value: unknown): Result<string, JSON.Error>
 * ```
 *
 * Turns `value` into JSON like `JSON.stringify`, and returns what it throws as an `Err`: for a
 * value that refers to itself, or contains a `bigint`.
 *
 * Also fails for values that have no JSON form, where `JSON.stringify` returns `undefined`:
 * `undefined`, a function or a symbol.
 *
 * ## Example
 *
 * ```ts
 * JSON.tryStringify({ a: 1 }); // Ok(`{"a":1}`)
 * JSON.tryStringify({ a: 1n }); // Err({ name: "JSONError", message: "Failed to stringify JSON", cause: { name: "TypeError", … } })
 * JSON.tryStringify(undefined); // Err({ name: "JSONError", message: "Failed to stringify JSON: undefined has no JSON form" })
 * ```
 */
export function tryStringify(value: unknown): Result<string, JSON.Error> {
    try {
        const text = globalThis.JSON.stringify(value) as string | undefined
        if (text === undefined) return Err({ message: `Failed to stringify JSON: ${typeof value} has no JSON form`, name: "JSONError" })
        return Ok(text)
    }
    catch (error) {
        return Err({ cause: Failure.from(error), message: "Failed to stringify JSON", name: "JSONError" })
    }
}
