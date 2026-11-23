import { paint } from "../internals/ansi"

/** Gives `text` a green background. Returns `text` as it is when the output has no colors. */
export const bgGreen: (text: string) => string = paint("\x1b[42m", "\x1b[49m")
