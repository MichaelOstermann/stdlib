import { paint } from "../internals/ansi"

/** Makes `text` dim. Returns `text` as it is when the output has no colors. */
export const dim: (text: string) => string = paint("\x1b[2m", "\x1b[22m", "\x1b[22m\x1b[2m")
