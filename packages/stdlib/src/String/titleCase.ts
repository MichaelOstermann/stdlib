import type { TitleCase } from "../internals/strings"
import { identifierWords, pascalCaseWords } from "../internals/strings"

/**
 * # titleCase
 *
 * ```ts
 * function String.titleCase<T extends string>(
 *     target: T,
 * ): TitleCase<T>
 * ```
 *
 * Converts `target` string to Title Case format.
 *
 * ## Example
 *
 * ```ts
 * String.titleCase("hello world"); // "Hello World"
 * String.titleCase("hello-world"); // "Hello World"
 * ```
 */
export function titleCase<T extends string>(target: T): TitleCase<T> {
    return identifierWords(pascalCaseWords(identifierWords(target))).join(" ") as TitleCase<T>
}
