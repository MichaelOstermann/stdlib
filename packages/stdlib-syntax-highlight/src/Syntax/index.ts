import type { ReadonlySignal } from "@monstermann/stdlib"
import type { tokenClasses } from "./internals/tokenClasses"
import { find } from "./find"
import { highlighter } from "./highlighter"
import { languages } from "./languages"
import { search } from "./search"

/** A language there is a grammar for, found by its `title`, `names` or `extensions`. */
export interface Language {
    extensions: string[]
    names: string[]
    popular: boolean
    scope: string
    title: string
}

/** What a token is, for the app to color: a `Record<TokenClass, string>` covers every one. */
export type TokenClass = (typeof tokenClasses)[number]

/** A piece of highlighted code, `length` in UTF-16 code units like the length of a string. */
export interface Token {
    class: TokenClass | undefined
    length: number
}

/** What `Syntax.highlighter` starts. */
export interface Highlighter {
    $loaded: ReadonlySignal<ReadonlySet<string>>
    $loading: ReadonlySignal<ReadonlySet<string>>
    $ready: Memo<boolean>
    highlight: (text: string, scope: string) => Token[]
    load: (scope: string) => Promise<void>
}

export const Syntax = {
    find,
    highlighter,
    languages,
    search,
}
