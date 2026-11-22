import type { CamelCase } from "../internals/strings"
import { identifierWords, pascalCaseWords } from "../internals/strings"

/**
 * # camelCase
 *
 * Converts `target` string to camelCase format.
 *
 * ## Example
 *
 * ```ts
 * String.camelCase("hello world"); // "helloWorld"
 * String.camelCase("hello-world"); // "helloWorld"
 * ```
 */
export function camelCase<T extends string>(target: T): CamelCase<T> {
    const result = pascalCaseWords(identifierWords(target))
    return (result.charAt(0).toLowerCase() + result.slice(1)) as CamelCase<T>
}
