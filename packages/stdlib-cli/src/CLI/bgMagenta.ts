import { paint } from "../internals/ansi"

/** Gives `text` a magenta background. Returns `text` as it is when the output has no colors. */
export const bgMagenta: (text: string) => string = paint("\x1b[45m", "\x1b[49m")
