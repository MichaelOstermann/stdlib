import { paint } from "../internals/ansi"

/**
 * Swaps the colors of `text` and its background. Returns `text` as it is when the output has no
 * colors.
 */
export const inverse: (text: string) => string = paint("\x1b[7m", "\x1b[27m")
