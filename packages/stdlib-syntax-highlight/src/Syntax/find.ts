import type { Language } from "."
import { plain } from "./internals/plain"
import { languages } from "./languages"
import { search } from "./search"

/**
 * # find
 *
 * Returns the language that a code fence names, such as the `ts` of ` ```ts `. An exact match of an
 * extension or a name wins, popular languages first. Otherwise, returns the first language that
 * `Syntax.search` finds. Case is ignored. Words such as `text` return `undefined`.
 *
 * ## Example
 *
 * ```ts
 * Syntax.find("ts")?.title;
 * // "TypeScript"
 *
 * Syntax.find("javascrip")?.title;
 * // "JavaScript"
 *
 * Syntax.find("text");
 * // undefined
 * ```
 */
export function find(fence: string): Language | undefined {
    const word = fence.trim().toLowerCase()
    if (!word || plain.includes(word)) return undefined
    const named = (language: Language) => language.extensions.includes(word) || language.names.includes(word)
    return languages.find((language) => language.popular && named(language))
        ?? languages.find(named)
        ?? search(word)[0]
}
