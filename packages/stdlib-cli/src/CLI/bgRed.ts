import { paint } from "../internals/ansi"

/** Gives `text` a red background. Returns `text` as it is when the output has no colors. */
export const bgRed: (text: string) => string = paint("\x1b[41m", "\x1b[49m")
