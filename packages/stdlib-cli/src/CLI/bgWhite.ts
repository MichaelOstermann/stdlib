import { paint } from "../internals/ansi"

/** Gives `text` a white background. Returns `text` as it is when the output has no colors. */
export const bgWhite: (text: string) => string = paint("\x1b[47m", "\x1b[49m")
