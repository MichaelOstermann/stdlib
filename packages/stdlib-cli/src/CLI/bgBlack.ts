import { paint } from "../internals/ansi"

/** Gives `text` a black background. Returns `text` as it is when the output has no colors. */
export const bgBlack: (text: string) => string = paint("\x1b[40m", "\x1b[49m")
