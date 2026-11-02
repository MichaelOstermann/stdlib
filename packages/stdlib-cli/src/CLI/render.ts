const HIDE_CURSOR = "\x1b[?25l"
const SHOW_CURSOR = "\x1b[?25h"
// Terminals that support it show the frame once it is complete, the others ignore it.
const SYNC_START = "\x1b[?2026h"
const SYNC_END = "\x1b[?2026l"

/**
 * # render
 *
 * ```ts
 * function CLI.render(lines: (width: number) => string[]): () => void
 * ```
 *
 * Writes the lines below what is already in the terminal, and writes them again whenever a signal
 * that `lines` read changes, or the width of the terminal. Lines are cut to that width. Returns
 * what stops it, which draws them one last time and leaves them where they are, or nothing when
 * there are none.
 *
 * The cursor is hidden until then: draw your own, e.g. with `CLI.inverse`. One at a time, and
 * nothing else should write to the terminal in the meantime.
 *
 * ## Example
 *
 * ```ts
 * const $text = Signal("");
 *
 * const stop = CLI.render((width) => [
 *     `Email  ${$text()}${CLI.inverse(" ")}`,
 *     CLI.dim("Press Enter to continue"),
 * ]);
 * ```
 */
export function render(lines: (width: number) => string[]): () => void {
    const $width = Signal(process.stdout.columns)
    const resize = (): void => {
        $width(process.stdout.columns)
    }
    const showCursor = (): void => {
        process.stdout.write(SHOW_CURSOR)
    }
    // The widths of the lines on screen, to know how many rows they take after a resize.
    let written: number[] = []

    process.stdout.write(HIDE_CURSOR)
    process.stdout.on("resize", resize)
    process.on("exit", showCursor)

    const draw = (): void => {
        const width = $width()
        const frame = lines(width).map((line) => Bun.sliceAnsi(line, 0, width))
        process.stdout.write(`${SYNC_START}${erase(written, width)}${frame.join("\n")}${SYNC_END}`)
        written = frame.map((line) => Bun.stringWidth(line))
    }
    const stop = Effect(draw)

    return () => {
        stop()
        // Within a batch, as in `CLI.onKey`, what changed right before has not been drawn yet.
        draw()
        process.stdout.off("resize", resize)
        process.off("exit", showCursor)
        process.stdout.write(written.length ? `\n${SHOW_CURSOR}` : SHOW_CURSOR)
    }
}

/**
 * Moves to the start of the first line written and erases everything below. A terminal that got
 * narrower may have wrapped them, into as many rows as they are wide now.
 */
function erase(widths: number[], width: number): string {
    if (!widths.length) return ""
    const rows = widths.reduce((sum, line) => sum + Math.max(1, Math.ceil(line / width)), 0)
    return `\r${rows > 1 ? `\x1b[${rows - 1}A` : ""}\x1b[J`
}
