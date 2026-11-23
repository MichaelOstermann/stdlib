import { paint } from "../internals/ansi"

/** Makes `text` bold. Returns `text` as it is when the output has no colors. */
export const bold: (text: string) => string = paint("\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m")
