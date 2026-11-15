import { colors } from "../internals/colors"
import { boolean } from "./boolean"
import { command } from "./command"
import { help as commandHelp } from "./commands/help"
import { pick as pickCommand } from "./commands/pick"
import { resolve as resolveCommand } from "./commands/resolve"
import { enumI } from "./enum"
import { agent } from "./env/agent"
import { ci } from "./env/ci"
import { color } from "./env/color"
import { human } from "./env/human"
import { formatFailure } from "./formatFailure"
import { formatJSON } from "./formatJSON"
import { resolve as resolveHelp } from "./help/resolve"
import { help as optionsHelp } from "./options/help"
import { resolve as resolveOptions } from "./options/resolve"
import { run } from "./run"
import { string } from "./string"
import { confirm } from "./terminal/confirm"
import { input } from "./terminal/input"
import { onKey } from "./terminal/onKey"
import { prompt } from "./terminal/prompt"
import { render } from "./terminal/render"
import { select } from "./terminal/select"

export type { Colors } from "../internals/colors"
export type { PickedCommand } from "./commands/pick"
export type { FormatOptions } from "./formatJSON"
export type { ConfirmOptions, ConfirmSlot } from "./terminal/confirm"
export type { Input } from "./terminal/input"
export type { Key } from "./terminal/onKey"
export type { PromptOptions, PromptSlot } from "./terminal/prompt"
export type { SelectOptions, SelectSlot } from "./terminal/select"
export type {
    ActionCommand,
    ActionCommandConfig,
    AnyCommand,
    BooleanOption,
    BooleanOptionConfig,
    CLIInvalidOptionError,
    CLIMissingOptionError,
    CLIMissingValueError,
    CLIOptionError,
    CLIOptionsError,
    CLIUnhandledExceptionError,
    CLIUnknownCommandError,
    CLIUnknownOptionError,
    Command,
    CommandConfig,
    CommandOption,
    CommandOptions,
    Commands,
    EnumOption,
    EnumOptionConfig,
    InferOption,
    InferOptions,
    InferRPC,
    MergeOptions,
    ResolvedCommand,
    ResolvedOptions,
    StringOption,
    StringOptionConfig,
} from "./types"

export const CLI = {
    ...colors,
    boolean,
    command,
    commands: { help: commandHelp, pick: pickCommand, resolve: resolveCommand },
    enum: enumI,
    env: { agent, ci, color, human },
    formatFailure,
    formatJSON,
    help: { resolve: resolveHelp },
    options: { help: optionsHelp, resolve: resolveOptions },
    run,
    string,
    terminal: { confirm, input, onKey, prompt, render, select },
}
