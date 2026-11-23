import { paint } from "../internals/ansi"

/** Colors `text` red. Returns `text` as it is when the output has no colors. */
export const red: (text: string) => string = paint("\x1b[31m", "\x1b[39m")
