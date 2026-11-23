import { paint } from "../internals/ansi"

/** Gives `text` a blue background. Returns `text` as it is when the output has no colors. */
export const bgBlue: (text: string) => string = paint("\x1b[44m", "\x1b[49m")
