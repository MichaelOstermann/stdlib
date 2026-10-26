import type { ConstantCase } from "../internals/strings"
import { identifierWords } from "../internals/strings"

/**
 * # constantCase
 *
 * ```ts
 * function String.constantCase<T extends string>(
 *     target: T,
 * ): ConstantCase<T>
 * ```
 *
 * Converts `target` string to CONSTANT_CASE format.
 *
 * ## Example
 *
 * ```ts
 * String.constantCase("hello world"); // "HELLO_WORLD"
 * String.constantCase("helloWorld"); // "HELLO_WORLD"
 * ```
 */
export function constantCase<T extends string>(target: T): ConstantCase<T> {
    return identifierWords(target).join("_").toUpperCase() as ConstantCase<T>
}
