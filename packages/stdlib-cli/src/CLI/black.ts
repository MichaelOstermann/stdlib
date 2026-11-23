import { paint } from "../internals/ansi"

/** Colors `text` black. Returns `text` as it is when the output has no colors. */
export const black: (text: string) => string = paint("\x1b[30m", "\x1b[39m")
