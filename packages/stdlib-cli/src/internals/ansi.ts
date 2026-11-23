// Taken from createColors of picocolors@1.1.1, picocolors.js, ISC License, Copyright (c) 2021-2024 Oleksii Raspopov, Kostiantyn Denysov, Anton Verinov.
// Without the bright colors and `gray`, which terminal themes paint in whatever color they like, and without detecting whether to color.

import { hasColor } from "../CLI/hasColor"

/**
 * Returns a function that wraps text in `open` and `close`, or leaves it as it is when the output
 * has no colors.
 */
export function paint(open: string, close: string, replace: string = open): (text: string) => string {
    return (text) => {
        if (!hasColor()) return text
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
