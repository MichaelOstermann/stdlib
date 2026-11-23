import { paint } from "../internals/ansi"

/** Underlines `text`. Returns `text` as it is when the output has no colors. */
export const underline: (text: string) => string = paint("\x1b[4m", "\x1b[24m")
