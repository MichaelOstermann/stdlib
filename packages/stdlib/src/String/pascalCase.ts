import type { PascalCase } from "./internals/words"
import { identifierWords, pascalCaseWords } from "./internals/words"

/**
 * # pascalCase
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
