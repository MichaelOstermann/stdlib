import { paint } from "../internals/ansi"

/** Colors `text` green. Returns `text` as it is when the output has no colors. */
export const green: (text: string) => string = paint("\x1b[32m", "\x1b[39m")
