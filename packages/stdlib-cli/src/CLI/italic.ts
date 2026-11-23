import { paint } from "../internals/ansi"

/** Makes `text` italic. Returns `text` as it is when the output has no colors. */
export const italic: (text: string) => string = paint("\x1b[3m", "\x1b[23m")
