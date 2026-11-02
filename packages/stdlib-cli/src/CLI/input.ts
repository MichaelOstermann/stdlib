import type { Key } from "./onKey"
import { CURSOR } from "../internals/cursor"

export interface Input {
    /**
     * The part of the value that fits in `width` columns, around the cursor, which `CLI.render`
     * puts where it is.
     */
    (width: number): string
    /** Where the cursor is, as an index into the value, always between two characters. */
    $cursor: Signal<number>
    $value: Signal<string>
    deleteNextChar: () => void
    deleteNextWord: () => void
    deletePrevChar: () => void
    deletePrevWord: () => void
    goToEnd: () => void
    clear: () => void
    goToNextChar: () => void
    goToNextWord: () => void
    onKey: (key: Key) => boolean
    goToPrevChar: () => void
    goToPrevWord: () => void
    goToStart: () => void
    /** Inserts at the cursor and moves it behind. Line breaks become spaces. */
    insertText: (text: string) => void
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" })
const words = new Intl.Segmenter(undefined, { granularity: "word" })

/**
 * # input
 *
 * ```ts
 * function CLI.input(): Input
 * ```
 *
 * A line of text that can be edited, with a cursor. It does not listen to keys: call its methods
 * from `CLI.onKey`, and draw it in `CLI.render`. When the value is wider than the room it gets, it
 * scrolls to keep the cursor in view.
 *
 * Characters are what a person sees as one, also emoji and accented letters. Words are what
 * `Intl.Segmenter` finds: `jane@example.com` is two, `jane` and `example.com`.
 *
 * ## Example
 *
 * ```ts
 * const email = CLI.input();
 *
 * CLI.render((width) => [`Email  ${email(width - 7)}`]);
 *
 * CLI.onKey((key) => {
 *     if (key.name === "Backspace") email.deletePrevChar();
 *     else if (key.name === "ArrowLeft") email.goToPrevChar();
 *     else email.insertText(key.text);
 * });
 * ```
 */
export function input(): Input {
    const $value = Signal("")
    const $cursor = Signal(0)
    // The index of the first character shown, kept between draws so the value only scrolls when the
    // cursor would leave the room.
    let scroll = 0

    function edit(start: number, end: number, text: string): void {
        const value = $value()
        batch(() => {
            $value(value.slice(0, start) + text + value.slice(end))
            $cursor(start + text.length)
        })
    }

    const draw = (width: number): string => {
        const value = $value()
        const cursor = Math.min($cursor(), value.length)
        const at = value.slice(cursor, nextChar(value, cursor)) || " "
        // Behind the last character there has to be room for the cursor.
        if (cursor < scroll) scroll = cursor
        while (scroll < cursor && Bun.stringWidth(value.slice(scroll, cursor) + at) > width) scroll = nextChar(value, scroll)
        while (scroll > 0 && Bun.stringWidth(`${value.slice(prevChar(value, scroll))} `) <= width) scroll = prevChar(value, scroll)
        const shown = Bun.sliceAnsi(value.slice(scroll), 0, width)
        return shown.slice(0, cursor - scroll) + CURSOR + shown.slice(cursor - scroll)
    }

    return Object.assign(draw, {
        $cursor,
        $value,
        deleteNextChar: () => edit($cursor(), nextChar($value(), $cursor()), ""),
        deleteNextWord: () => edit($cursor(), nextWordEnd($value(), $cursor()), ""),
        deletePrevChar: () => edit(prevChar($value(), $cursor()), $cursor(), ""),
        deletePrevWord: () => edit(prevWordStart($value(), $cursor()), $cursor(), ""),
        goToEnd: () => $cursor($value().length),
        goToNextChar: () => $cursor(nextChar($value(), $cursor())),
        goToNextWord: () => $cursor(nextWordEnd($value(), $cursor())),
        goToPrevChar: () => $cursor(prevChar($value(), $cursor())),
        goToPrevWord: () => $cursor(prevWordStart($value(), $cursor())),
        goToStart: () => $cursor(0),
        insertText: (text: string) => edit($cursor(), $cursor(), text.replaceAll(/\r\n|[\r\n]/g, " ")),
        clear: () => batch(() => {
            $value("")
            $cursor(0)
        }),
        onKey(key: Key) {
            if (key.name === "ArrowLeft" && (key.ctrl || key.alt)) this.goToPrevWord()
            else if (key.name === "ArrowRight" && (key.ctrl || key.alt)) this.goToNextWord()
            else if (key.name === "ArrowLeft") this.goToPrevChar()
            else if (key.name === "ArrowRight") this.goToNextChar()
            else if (key.name === "Backspace" && (key.ctrl || key.alt)) this.deletePrevWord()
            else if (key.name === "Backspace") this.deletePrevChar()
            else if (key.name === "Delete" && (key.ctrl || key.alt)) this.deleteNextWord()
            else if (key.name === "Delete") this.deleteNextChar()
            else if (key.name === "c" && key.ctrl && peek($value)) this.clear()
            else if (key.text) this.insertText(key.text)
            else return false
            return true
        },
    })
}

function prevChar(value: string, index: number): number {
    let prev = 0
    for (const { index: start } of graphemes.segment(value)) {
        if (start >= index) break
        prev = start
    }
    return prev
}

function nextChar(value: string, index: number): number {
    const grapheme = graphemes.segment(value).containing(index)
    return grapheme ? grapheme.index + grapheme.segment.length : value.length
}

/** The start of the word the cursor is in, or of the one before. */
function prevWordStart(value: string, index: number): number {
    let start = 0
    for (const segment of words.segment(value)) {
        if (segment.index >= index) break
        if (segment.isWordLike) start = segment.index
    }
    return start
}

/** The end of the word the cursor is in, or of the one after. */
function nextWordEnd(value: string, index: number): number {
    for (const segment of words.segment(value)) {
        const end = segment.index + segment.segment.length
        if (segment.isWordLike && end > index) return end
    }
    return value.length
}
