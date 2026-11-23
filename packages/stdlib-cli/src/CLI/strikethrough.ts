import { paint } from "../internals/ansi"

/** Strikes through `text`. Returns `text` as it is when the output has no colors. */
export const strikethrough: (text: string) => string = paint("\x1b[9m", "\x1b[29m")
