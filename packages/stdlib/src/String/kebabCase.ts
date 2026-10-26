import type { KebabCase } from "../internals/strings"
import { identifierWords } from "../internals/strings"

/**
 * # kebabCase
 *
 * ```ts
 * function String.kebabCase<T extends string>(
 *     target: T,
 * ): KebabCase<T>
 * ```
 *
 * Converts `target` string to kebab-case format.
 *
 * ## Example
 *
 * ```ts
 * String.kebabCase("hello world"); // "hello-world"
 * String.kebabCase("helloWorld"); // "hello-world"
 * ```
 */
export function kebabCase<T extends string>(target: T): KebabCase<T> {
    return identifierWords(target).join("-").toLowerCase() as KebabCase<T>
}
