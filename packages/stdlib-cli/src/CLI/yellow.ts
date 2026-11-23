import { paint } from "../internals/ansi"

/** Colors `text` yellow. Returns `text` as it is when the output has no colors. */
export const yellow: (text: string) => string = paint("\x1b[33m", "\x1b[39m")
