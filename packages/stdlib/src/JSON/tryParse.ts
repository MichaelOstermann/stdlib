import type { Result } from "../Result"
import { Err, Ok } from "../Result"

/**
 * # tryParse
 *
 * ```ts
 * function JSON.tryParse(text: string): Result<unknown, SyntaxError>
 * ```
 *
 * Parses `text` like `JSON.parse`, and returns the error it throws as an `Err`.
 *
 * ## Example
 *
 * ```ts
 * JSON.tryParse(`{"a":1}`); // Ok({ a: 1 })
 * JSON.tryParse("{"); // Err(SyntaxError)
 * JSON.tryParse(text).unwrapOr(null);
 * ```
 */
export function tryParse(text: string): Result<unknown, SyntaxError> {
    try {
        return Ok(JSON.parse(text) as unknown)
    }
    catch (error) {
        return Err(error as SyntaxError)
    }
}
