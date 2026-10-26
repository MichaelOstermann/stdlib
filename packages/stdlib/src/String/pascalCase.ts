import type { PascalCase } from "../internals/strings"
import { identifierWords, pascalCaseWords } from "../internals/strings"

/**
 * # pascalCase
 *
 * ```ts
 * function String.pascalCase<T extends string>(
 *     target: T,
 * ): PascalCase<T>
 * ```
 *
 * Converts `target` string to PascalCase format.
 *
 * ## Example
 *
 * ```ts
 * String.pascalCase("hello world"); // "HelloWorld"
 * String.pascalCase("hello-world"); // "HelloWorld"
 * ```
 */
export function pascalCase<T extends string>(target: T): PascalCase<T> {
    return pascalCaseWords(identifierWords(target)) as PascalCase<T>
}
