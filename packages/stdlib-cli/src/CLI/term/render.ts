import { CURSOR } from "../../internals/cursor"

const HIDE_CURSOR = "\x1b[?25l"
const SHOW_CURSOR = "\x1b[?25h"
// Terminals that support it show the frame once it is complete, the others ignore it.
const SYNC_START = "\x1b[?2026h"
const SYNC_END = "\x1b[?2026l"

/**
 * # render
 *
 * Draws `lines` below what is in the terminal, and again whenever a signal they read changes.
 * Stopping it draws them one last time with `done`, and leaves them on screen.
 *
 * ## Example
 *
 * ```ts
 * const email = CLI.term.input();
 *
 * const stop = CLI.term.render((width, done) => done
 *     ? [`Email  ${CLI.ansi.dim(email.$value())}`]
 *     : [`Email  ${email(width - 7)}`, CLI.ansi.dim("Press Enter to continue")]);
 * ```
 */
export function render(lines: (width: number, done: boolean) => string[]): () => void {
    const $width = Signal(process.stdout.columns)
    const resize = (): void => {
        $width(process.stdout.columns)
    }
    const showCursor = (): void => {
        process.stdout.write(SHOW_CURSOR)
    }
    // The widths of the lines on screen, to know how many rows they take after a resize.
    let written: number[] = []
    let cursor: Cursor | undefined

    process.stdout.write(HIDE_CURSOR)
    process.stdout.on("resize", resize)
    process.on("exit", showCursor)

    const draw = (done: boolean): void => {
        const width = $width()
        const before = erase(written, cursor, width)
        cursor = undefined
        const frame = lines(width, done).map((line, row) => {
            const index = line.indexOf(CURSOR)
            if (index !== -1) cursor ??= { col: Math.min(Bun.stringWidth(line.slice(0, index)), width - 1), row }
            return Bun.sliceAnsi(line.replaceAll(CURSOR, ""), 0, width)
        })
        written = frame.map((line) => Bun.stringWidth(line))
        process.stdout.write(`${SYNC_START}${HIDE_CURSOR}${before}${frame.join("\n")}${place(cursor, frame.length)}${SYNC_END}`)
    }
    const stop = Effect(() => draw(false))

    return () => {
        stop()
        draw(true)
        process.stdout.off("resize", resize)
        process.off("exit", showCursor)
        // Below the last line, for what is written next.
        const down = cursor ? written.length - 1 - cursor.row : 0
        process.stdout.write(`${down ? `\x1b[${down}B` : ""}${written.length ? "\n" : ""}${SHOW_CURSOR}`)
    }
}

interface Cursor {
    col: number
    row: number
}

/** From the end of the last line to the cursor, shown, or nowhere, hidden. */
function place(cursor: Cursor | undefined, rows: number): string {
    if (!cursor) return ""
    const up = rows - 1 - cursor.row
    return `${up ? `\x1b[${up}A` : ""}\x1b[${cursor.col + 1}G${SHOW_CURSOR}`
}

/**
 * Moves from the cursor, or the end of the last line, to the start of the first line written, and
 * erases everything below. A terminal that got narrower may have wrapped them, into as many rows as
 * they are wide now.
 */
function erase(widths: number[], cursor: Cursor | undefined, width: number): string {
    if (!widths.length) return ""
    const rows = (lines: number[]): number => lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line / width)), 0)
    const up = cursor
        ? rows(widths.slice(0, cursor.row)) + Math.floor(cursor.col / width)
        : rows(widths) - 1
    return `\r${up ? `\x1b[${up}A` : ""}\x1b[J`
}
