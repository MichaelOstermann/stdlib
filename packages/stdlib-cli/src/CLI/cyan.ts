import { paint } from "../internals/ansi"

/** Colors `text` cyan. Returns `text` as it is when the output has no colors. */
export const cyan: (text: string) => string = paint("\x1b[36m", "\x1b[39m")
