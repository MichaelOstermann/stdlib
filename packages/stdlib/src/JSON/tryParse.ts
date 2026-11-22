import type { JSON } from "."
import type { Result } from "../Result"
import { Failure } from "../Failure"
import { Err, Ok } from "../Result"

/**
 * # tryParse
 *
 * Parses `text` like `JSON.parse`. Returns an `Err` instead of throwing.
 *
 * ## Example
 *
 * ```ts
 * JSON.tryParse(`{"a":1}`); // Ok({ a: 1 })
 * JSON.tryParse("{"); // Err({ name: "JSONError", message: "Failed to parse JSON", cause: { name: "SyntaxError", … } })
 * JSON.tryParse(text).unwrapOr(null);
 * ```
 */
export function tryParse(text: string): Result<unknown, JSON.Error> {
    try {
        return Ok(globalThis.JSON.parse(text) as unknown)
    }
    catch (error) {
        return Err<JSON.Error>({ cause: Failure.from(error), message: "Failed to parse JSON", name: "JSONError" })
    }
}
