import { paint } from "../internals/ansi"

/** Colors `text` white. Returns `text` as it is when the output has no colors. */
export const white: (text: string) => string = paint("\x1b[37m", "\x1b[39m")
