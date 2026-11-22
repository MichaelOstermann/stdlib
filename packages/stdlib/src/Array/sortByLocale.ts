import type { Updated } from "../internals/types"
import { sortByKeys } from "../internals/arrays"

type LocaleOptions = Intl.CollatorOptions & {
    /** The language that decides the order. Defaults to the language of the runtime. */
    locales?: Intl.LocalesArgument
    order?: "asc" | "desc"
}

let collator: Intl.Collator | undefined

/**
 * # sortByLocale
 *
 * Sorts by the text that `by` returns for each element, in the order of a language: `ä` next to
 * `a`, uppercase next to lowercase. Descending with `{ order: "desc" }`.
 *
 * The options take `locales` and every `Intl.Collator` option: `{ numeric: true }` puts `"2"`
 * before `"10"`.
 *
 * Elements with the same text keep their order. Returns `target` itself when `target` is already
 * sorted.
 *
 * ## Example
 *
 * ```ts
 * Array.sortByLocale(notes, note => note.title);
 * Array.sortByLocale(["b", "ä", "A"], text => text); // ["A", "ä", "b"]
 * Array.sortByLocale(["v10", "v2"], text => text, { numeric: true }); // ["v2", "v10"]
 * Array.sortByLocale(["ä", "z"], text => text, { locales: "sv" }); // ["z", "ä"]
 * ```
 */
export function sortByLocale<T extends readonly unknown[]>(target: T, by: (value: T[number], index: number, target: T) => string, options?: LocaleOptions): Updated<T>
export function sortByLocale(target: unknown[], by: (value: unknown, index: number, target: unknown[]) => string, options?: LocaleOptions): unknown[] {
    let compare: (a: string, b: string) => number
    if (options && Object.keys(options).some((key) => key !== "order")) {
        const { locales, order: _order, ...rest } = options
        compare = new Intl.Collator(locales, rest).compare
    }
    else {
        compare = (collator ??= new Intl.Collator()).compare
    }

    return sortByKeys(target, target.map(by), compare, options)
}
