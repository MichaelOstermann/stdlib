import type { ReadonlySignal } from "@monstermann/stdlib"
import type { tokenClasses } from "./internals/tokenClasses"
import { find } from "./find"
import { highlighter } from "./highlighter"
import { languages } from "./languages"
import { search } from "./search"

/** A language that has a grammar. Search finds the language by `title`, `names` or `extensions`. */
export interface Language {
    extensions: string[]
    names: string[]
    popular: boolean
    scope: string
    title: string
}

/** What a token is, so the app can color it. A `Record<TokenClass, string>` covers every class. */
export type TokenClass = (typeof tokenClasses)[number]

/** A piece of highlighted code. `length` counts UTF-16 code units, like the length of a string. */
export interface Token {
    class: TokenClass | undefined
    length: number
}

/** The result of `Syntax.highlighter`. */
export interface Highlighter {
    $loaded: ReadonlySignal<ReadonlySet<string>>
    $loading: ReadonlySignal<ReadonlySet<string>>
    $ready: ReadonlySignal<boolean>
    highlight: (text: string, scope: string) => Token[]
    load: (scope: string) => Promise<void>
}

export const Syntax = {
    find,
    highlighter,
    languages,
    search,
}
