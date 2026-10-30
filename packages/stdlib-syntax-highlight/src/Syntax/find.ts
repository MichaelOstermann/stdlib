import type { Language } from "."
import { plain } from "./internals/plain"
import { languages } from "./languages"
import { search } from "./search"

/**
 * # find
 *
 * ```ts
 * function Syntax.find(fence: string): Language | undefined
 * ```
 *
 * The language a code fence names, such as the `ts` of ` ```ts `. An extension or a name that
 * matches exactly wins, preferring popular languages, then the first language `Syntax.search` finds
 * for it. Case is ignored, and words such as `text` give `undefined`.
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
