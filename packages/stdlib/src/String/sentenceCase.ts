import type { SentenceCase } from "./internals/words"
import { identifierWords } from "./internals/words"

/**
 * # sentenceCase
 *
 * Converts `target` string to Sentence case format.
 *
 * ## Example
 *
 * ```ts
 * String.sentenceCase("firstName"); // "First name"
 * String.sentenceCase("hello-world"); // "Hello world"
 * ```
 */
export function sentenceCase<T extends string>(target: T): SentenceCase<T> {
    const words = identifierWords(target).join(" ").toLowerCase()
    return (words.charAt(0).toUpperCase() + words.slice(1)) as SentenceCase<T>
}
