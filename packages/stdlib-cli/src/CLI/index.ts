import { boolean } from "./boolean"
import { colors } from "./colors"
import { command } from "./command"
import { format } from "./format"
import { isAgent } from "./isAgent"
import { isCI } from "./isCI"
import { isInteractive } from "./isInteractive"
import { resolve } from "./resolve"
import { run } from "./run"
import { shouldColor } from "./shouldColor"

export type { Token } from "../internals/Tokens"
export type { Colors } from "./colors"
export type { OptionInput } from "./command"
export type { CLIError, Command, Option, Outcome } from "./types"

export const CLI = {
    ...colors,
    boolean,
    command,
    format,
    isAgent,
    isCI,
    isInteractive,
    resolve,
    run,
    shouldColor,
}
