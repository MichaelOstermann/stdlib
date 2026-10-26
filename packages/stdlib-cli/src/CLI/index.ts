import { colors } from "./colors"
import { command } from "./command"
import { isAgent } from "./isAgent"
import { isCI } from "./isCI"
import { isInteractive } from "./isInteractive"
import { resolve } from "./resolve"
import { shouldColor } from "./shouldColor"

export type { Colors } from "./colors"
export type { OptionInput } from "./command"
export type { CLIError, Command, Option, Outcome } from "./types"

export const CLI = {
    ...colors,
    command,
    isAgent,
    isCI,
    isInteractive,
    resolve,
    shouldColor,
}
