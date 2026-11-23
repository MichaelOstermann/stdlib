import { paint } from "../internals/ansi"

/** Gives `text` a yellow background. Returns `text` as it is when the output has no colors. */
export const bgYellow: (text: string) => string = paint("\x1b[43m", "\x1b[49m")
