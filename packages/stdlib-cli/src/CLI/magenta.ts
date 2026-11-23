import { paint } from "../internals/ansi"

/** Colors `text` magenta. Returns `text` as it is when the output has no colors. */
export const magenta: (text: string) => string = paint("\x1b[35m", "\x1b[39m")
