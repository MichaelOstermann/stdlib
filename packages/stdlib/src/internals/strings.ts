// The splitting of words and the types that tell its result are taken from string-ts, MIT License, Copyright (c) 2023 Gustavo Guichard.

type IsStringLiteral<T extends string> = [T] extends [string]
    ? [string] extends [T] ? false
        : Uppercase<T> extends Uppercase<Lowercase<T>>
            ? Lowercase<T> extends Lowercase<Uppercase<T>> ? true : false
            : false
    : false

type Join<T extends readonly string[], D extends string = ""> = IsStringLiteral<D | T[number]> extends true
    ? T extends readonly [infer First extends string, ...infer Rest extends string[]]
        ? Rest extends [] ? First : `${First}${D}${Join<Rest, D>}`
        : ""
    : string

type PascalCaseAll<T extends string[]> = T extends [infer Head extends string, ...infer Rest extends string[]]
    ? [Capitalize<Lowercase<Head>>, ...PascalCaseAll<Rest>]
    : T

type Reject<T, C, O extends unknown[] = []> = T extends [infer First, ...infer Rest]
    ? Reject<Rest, C, First extends C ? O : [...O, First]>
    : O

type DropSuffix<T extends string, S extends string> = string extends S | T ? string : T extends `${infer Rest}${S}` ? Rest : T

type ReplaceAll<T extends string, L extends string, R extends string = ""> = IsStringLiteral<L | R | T> extends true
    ? T extends `${infer Rest}${L}${infer Rest2}` ? `${Rest}${R}${ReplaceAll<Rest2, L, R>}` : T
    : string

type UpperLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"
type LowerLetter = Lowercase<UpperLetter>
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
type Separator = " " | "(" | ")" | "-" | "." | "/" | "[" | "\\" | "]" | "_" | "{" | "|" | "}"

type IsUpper<T extends string> = IsStringLiteral<T> extends true ? T extends UpperLetter ? true : false : boolean
type IsLower<T extends string> = IsStringLiteral<T> extends true ? T extends LowerLetter ? true : false : boolean
type IsDigit<T extends string> = IsStringLiteral<T> extends true ? T extends Digit ? true : false : boolean
type IsSeparator<T extends string> = IsStringLiteral<T> extends true ? T extends Separator ? true : false : boolean
/** Not a letter, digit, separator or apostrophe. */
type IsSpecial<T extends string> = IsStringLiteral<T> extends true ? T extends "'" | Digit | LowerLetter | Separator | UpperLetter ? false : true : boolean

type RemoveApostrophe<T extends string> = ReplaceAll<T, "'">

/**
 * The words of an identifier, `S` being what is left of it, `W` the word so far and `P` the
 * previous character.
 */
type Words<S extends string, W extends string = "", P extends string = ""> = IsStringLiteral<P | S | W> extends true
    ? S extends `${infer C}${infer Rest}`
        ? IsSeparator<C> extends true ? Reject<[W, ...Words<Rest>], "">
            : P extends "" ? Reject<Words<Rest, C, C>, "">
            : [false, true] extends [IsDigit<P>, IsDigit<C>] ? [W, ...Words<Rest, C, C>]
            : [true, false] extends [IsDigit<P>, IsDigit<C>] ? [W, ...Words<Rest, C, C>]
            : [false, true] extends [IsSpecial<P>, IsSpecial<C>] ? [W, ...Words<Rest, C, C>]
            : [true, false] extends [IsSpecial<P>, IsSpecial<C>] ? [W, ...Words<Rest, C, C>]
            : [true, true] extends [IsDigit<P>, IsDigit<C>] ? Reject<Words<Rest, `${W}${C}`, C>, "">
            : [true, true] extends [IsLower<P>, IsUpper<C>] ? [W, ...Words<Rest, C, C>]
            : [true, true] extends [IsUpper<P>, IsLower<C>] ? [DropSuffix<W, P>, ...Words<Rest, `${P}${C}`, C>]
            : Reject<Words<Rest, `${W}${C}`, C>, "">
        : Reject<[W], "">
    : string[]

export type DelimiterCase<T extends string, D extends string> = Join<Words<RemoveApostrophe<T>>, D>
export type PascalCase<T extends string> = Join<PascalCaseAll<Words<RemoveApostrophe<T>>>>
export type CamelCase<T extends string> = Uncapitalize<PascalCase<T>>
export type ConstantCase<T extends string> = Uppercase<DelimiterCase<T, "_">>
export type KebabCase<T extends string> = Lowercase<DelimiterCase<T, "-">>
export type SnakeCase<T extends string> = Lowercase<DelimiterCase<T, "_">>
export type TitleCase<T extends string> = DelimiterCase<PascalCase<T>, " ">

/**
 * The words of an identifier, without apostrophes: `helloWorld`, `hello-world` and `hello_world`
 * are `hello` and `world`
 */
export function identifierWords(target: string): string[] {
    return target
        .replaceAll("'", "")
        .replace(/[[\]{}()|/\-\\ _.]/g, " ")
        .replace(/([a-z])(\d)/gi, "$1 $2")
        .replace(/(\d)([a-z])/gi, "$1 $2")
        .replace(/([\w\-./])([^\w\-./'])/g, "$1 $2")
        .replace(/([^\w\-./'])([\w\-./])/g, "$1 $2")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
        .trim()
        .split(/\s+/)
}

/** `["hello", "WORLD"]` → `"HelloWorld"` */
export function pascalCaseWords(words: string[]): string {
    let result = ""
    for (const word of words) {
        // Lowercased as a whole first, a character can become several.
        const lower = word.toLowerCase()
        result += lower.charAt(0).toUpperCase() + lower.slice(1)
    }
    return result
}
