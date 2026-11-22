import { ansi } from "../CLI/ansi"
import { quote } from "./quote"

/**
 * Points at a word of the command line by its `index`. `part` narrows `--email=a@b.c` to the flag
 * or the value. `through` extends the mark to the end of a later word.
 */
export type Mark = { index: number, part?: "flag" | "value", through?: number }

export const Snippet = {
    /** Returns the command line, plus a second line that underlines the `marks`. */
    marked(words: string[], marks: Mark[]): string[] {
        const shown = words.map(typed)
        const line = shown.join(" ")
        const room = process.stdout.columns ?? 80
        const spans = marks.map((mark) => spanOf(shown, mark)).sort((a, b) => a.start - b.start)
        const start = Math.max(0, Math.min(spans[0]!.start - Math.floor(room / 3), line.length - room))
        const end = start + room
        const head = start > 0 ? "…" : ""
        const tail = end < line.length ? "…" : ""
        const underline = Array.from({ length: line.length }, () => " ")
        for (const span of spans) underline.fill("^", span.start, span.end)
        const cut = (text: string): string => text.slice(start + head.length, end - tail.length)
        return [`${head}${cut(line)}${tail}`, ansi.red(`${" ".repeat(head.length)}${cut(underline.join(""))}`.trimEnd())]
    },
}

function spanOf(shown: string[], mark: Mark): { end: number, start: number } {
    const startOf = (index: number): number => shown.slice(0, index).reduce((column, word) => column + word.length + 1, 0)
    const word = shown[mark.index]!
    const start = startOf(mark.index)
    const equals = word.indexOf("=")
    const through = mark.through ?? mark.index
    const end = startOf(through) + shown[through]!.length
    if (mark.part === "flag") return { end: start + equals, start }
    if (mark.part === "value") return { end, start: start + equals + 1 }
    return { end, start }
}

function typed(word: string): string {
    const equals = word.indexOf("=")
    if (word.startsWith("-") && equals !== -1) return `${word.slice(0, equals + 1)}${quote(word.slice(equals + 1))}`
    return quote(word)
}
