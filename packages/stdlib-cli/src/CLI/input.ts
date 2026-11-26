import type { CLI } from "."
import { batch, peek, Signal } from "@monstermann/stdlib"
import { CURSOR } from "../internals/cursor"

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" })
const words = new Intl.Segmenter(undefined, { granularity: "word" })

/**
 * # input
 *
 * Creates an editable line of text with a cursor. Call the methods of the input from `CLI.onKey`.
 * Draw the input in `CLI.render`. A `mask` hides the typed characters.
 *
 * ## Example
 *
 * ```ts
 * const email = CLI.input();
 *
 * CLI.render(({ width }) => [`Email  ${email(width - 7)}`]);
 *
 * CLI.onKey((key) => {
 *     if (key.name === "Backspace") email.deletePrevChar();
 *     else if (key.name === "ArrowLeft") email.goToPrevChar();
 *     else email.insertText(key.text);
 * });
 * ```
 */
export function input(options: { mask?: string } = {}): CLI.Input {
    const mask = options.mask
    const $value = Signal("")
    const $cursor = Signal(0)
    const $error = Signal<string | undefined>(undefined)
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
        const value = mask === undefined ? $value() : masked($value(), mask)
        const cursor = mask === undefined ? Math.min($cursor(), value.length) : masked($value().slice(0, $cursor()), mask).length
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
        $error,
        $value,
        deleteNextChar: () => edit($cursor(), nextChar($value(), $cursor()), ""),
        deleteNextWord: () => edit($cursor(), mask === undefined ? nextWordEnd($value(), $cursor()) : $value().length, ""),
        deletePrevChar: () => edit(prevChar($value(), $cursor()), $cursor(), ""),
        deletePrevWord: () => edit(mask === undefined ? prevWordStart($value(), $cursor()) : 0, $cursor(), ""),
        goToEnd: () => $cursor($value().length),
        goToNextChar: () => $cursor(nextChar($value(), $cursor())),
        goToNextWord: () => $cursor(mask === undefined ? nextWordEnd($value(), $cursor()) : $value().length),
        goToPrevChar: () => $cursor(prevChar($value(), $cursor())),
        goToPrevWord: () => $cursor(mask === undefined ? prevWordStart($value(), $cursor()) : 0),
        goToStart: () => $cursor(0),
        insertText: (text: string) => edit($cursor(), $cursor(), text.replaceAll(/\r\n|[\r\n]/g, " ")),
        clear: () => batch(() => {
            $value("")
            $cursor(0)
        }),
        onKey(key: CLI.Key) {
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

function masked(value: string, mask: string): string {
    return mask.repeat([...graphemes.segment(value)].length)
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

function prevWordStart(value: string, index: number): number {
    let start = 0
    for (const segment of words.segment(value)) {
        if (segment.index >= index) break
        if (segment.isWordLike) start = segment.index
    }
    return start
}

function nextWordEnd(value: string, index: number): number {
    for (const segment of words.segment(value)) {
        const end = segment.index + segment.segment.length
        if (segment.isWordLike && end > index) return end
    }
    return value.length
}
