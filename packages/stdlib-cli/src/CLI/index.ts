import { colors } from "./colors"
import { command } from "./command"
import { format } from "./format"
import { input } from "./input"
import { isAgent } from "./isAgent"
import { isCI } from "./isCI"
import { isInteractive } from "./isInteractive"
import { onKey } from "./onKey"
import { render } from "./render"
import { resolve } from "./resolve"
import { run } from "./run"
import { shouldColor } from "./shouldColor"

export type { Colors } from "./colors"
export type { OptionInput } from "./command"
export type { Input } from "./input"
export type { Key } from "./onKey"
export type { CLIError, Command, Option, Outcome } from "./types"

export const CLI = {
    ...colors,
    command,
    format,
    input,
    isAgent,
    isCI,
    isInteractive,
    onKey,
    render,
    resolve,
    run,
    shouldColor,
}
