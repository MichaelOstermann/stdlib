import type { SnakeCase } from "../internals/strings"
import { identifierWords } from "../internals/strings"

/**
 * # snakeCase
 *
 * ```ts
 * function String.snakeCase<T extends string>(
 *     target: T,
 * ): SnakeCase<T>
 * ```
 *
 * Converts `target` string to snake_case format.
 *
 * ## Example
 *
 * ```ts
 * String.snakeCase("hello world"); // "hello_world"
 * String.snakeCase("helloWorld"); // "hello_world"
 * ```
 */
export function snakeCase<T extends string>(target: T): SnakeCase<T> {
    return identifierWords(target).join("_").toLowerCase() as SnakeCase<T>
}
