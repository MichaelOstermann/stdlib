import type { Language } from "."
import { languages } from "./languages"

// How much a match counts when the language is not popular, so popular ones come first among matches about as good
const unpopular = 0.8

/**
 * # search
 *
 * ```ts
 * function Syntax.search(query: string): Language[]
 * ```
 *
 * The languages for a language picker. Without a query, the popular ones by title. With one, every
 * language whose title, names or extensions it matches, best first, popular ones ahead of others
 * that match about as well.
 *
 * ## Example
 *
 * ```ts
 * Syntax.search("").length;
 * // 86
 *
 * Syntax.search("typesc").map((language) => language.title);
 * // ["TypeScript", "TypeScript React", ...]
 * ```
 */
export function search(query: string): Language[] {
    const needle = query.trim()
    if (!needle) return languages.filter((language) => language.popular)
    return languages
        .map((language) => ({ language, score: score(language, needle) * (language.popular ? 1 : unpopular) }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((match) => match.language)
}

function score(language: Language, needle: string): number {
    const haystacks = [language.title, ...language.title.split(" "), ...language.names, ...language.extensions]
    return Math.max(...haystacks.map((haystack) => String.score(haystack, needle)))
}
