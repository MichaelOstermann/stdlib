// Taken from createColors of picocolors@1.1.1, picocolors.js, ISC License, Copyright (c) 2021-2024 Oleksii Raspopov, Kostiantyn Denysov, Anton Verinov.
// Without the bright colors and `gray`, which terminal themes paint in whatever color they like, and without detecting whether to color.

import { shouldColor } from "./shouldColor"

type Codes = readonly [open: string, close: string, replace?: string]

const STYLES = {
    bgBlack: ["\x1b[40m", "\x1b[49m"],
    bgBlue: ["\x1b[44m", "\x1b[49m"],
    bgCyan: ["\x1b[46m", "\x1b[49m"],
    bgGreen: ["\x1b[42m", "\x1b[49m"],
    bgMagenta: ["\x1b[45m", "\x1b[49m"],
    bgRed: ["\x1b[41m", "\x1b[49m"],
    bgWhite: ["\x1b[47m", "\x1b[49m"],
    bgYellow: ["\x1b[43m", "\x1b[49m"],
    black: ["\x1b[30m", "\x1b[39m"],
    blue: ["\x1b[34m", "\x1b[39m"],
    bold: ["\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m"],
    cyan: ["\x1b[36m", "\x1b[39m"],
    dim: ["\x1b[2m", "\x1b[22m", "\x1b[22m\x1b[2m"],
    green: ["\x1b[32m", "\x1b[39m"],
    inverse: ["\x1b[7m", "\x1b[27m"],
    italic: ["\x1b[3m", "\x1b[23m"],
    magenta: ["\x1b[35m", "\x1b[39m"],
    red: ["\x1b[31m", "\x1b[39m"],
    strikethrough: ["\x1b[9m", "\x1b[29m"],
    underline: ["\x1b[4m", "\x1b[24m"],
    white: ["\x1b[37m", "\x1b[39m"],
    yellow: ["\x1b[33m", "\x1b[39m"],
} satisfies Record<string, Codes>

export type Colors = Record<keyof typeof STYLES, (text: string) => string>

/**
 * # colors
 *
 * ```ts
 * function CLI.red(text: string): string // and bold, dim, italic, underline, inverse, strikethrough,
 *                                        // black, green, yellow, blue, magenta, cyan, white, bgRed, …
 * ```
 *
 * Text in a color or style, or as it is when `CLI.shouldColor()` says no, asked on every call.
 * Styles nest: `CLI.bold(CLI.red("Error"))`.
 *
 * There are no bright colors and no gray: terminal themes paint those in whatever color they like.
 *
 * ## Example
 *
 * ```ts
 * console.log(CLI.green("Member added"), CLI.dim("(jane@example.com)"));
 * ```
 */
export const colors = Object.fromEntries(
    Object.entries(STYLES).map(([name, codes]) => {
        const paint = style(codes)
        return [name, (text: string) => (shouldColor() ? paint(text) : text)]
    }),
) as Colors

function style([open, close, replace = open]: Codes): (text: string) => string {
    return (text) => {
        // A nested style that closes the same way, `red` in `blue`, would otherwise end this one early.
        const index = text.indexOf(close, open.length)
        if (index === -1) return open + text + close
        return open + replaceClose(text, close, replace, index) + close
    }
}

function replaceClose(text: string, close: string, replace: string, index: number): string {
    let result = ""
    let cursor = 0
    do {
        result += text.slice(cursor, index) + replace
        cursor = index + close.length
        index = text.indexOf(close, cursor)
    } while (index !== -1)
    return result + text.slice(cursor)
}
