import { paint } from "../internals/ansi"

/** Colors `text` blue. Returns `text` as it is when the output has no colors. */
export const blue: (text: string) => string = paint("\x1b[34m", "\x1b[39m")
