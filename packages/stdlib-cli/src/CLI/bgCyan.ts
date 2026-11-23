import { paint } from "../internals/ansi"

/** Gives `text` a cyan background. Returns `text` as it is when the output has no colors. */
export const bgCyan: (text: string) => string = paint("\x1b[46m", "\x1b[49m")
