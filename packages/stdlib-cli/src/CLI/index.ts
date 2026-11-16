import { ansi } from "./ansi"
import { boolean } from "./boolean"
import { command } from "./command"
import { commands } from "./commands"
import { console } from "./console"
import { enumI } from "./enum"
import { env } from "./env"
import { exec } from "./exec"
import { format } from "./format"
import { help } from "./help"
import { prompt } from "./prompt"
import { resolve } from "./resolve"
import { run } from "./run"
import { string } from "./string"
import { term } from "./term"

export type { Colors } from "./ansi"
export type { BooleanOption, BooleanOptionConfig } from "./boolean"
export type { ActionCommand, ActionCommandConfig, ActionReturn, Command, CommandConfig } from "./command"
export type { EnumOption, EnumOptionConfig } from "./enum"
export type { Execution } from "./exec"
export type { FormatOptions } from "./format/json"
export type { ConfirmOptions, ConfirmSlot } from "./prompt/confirm"
export type { SelectOptions, SelectSlot } from "./prompt/select"
export type { TextOptions, TextSlot } from "./prompt/text"
export type { ResolvedArgv } from "./resolve/argv"
export type { StringOption, StringOptionConfig, StringValue } from "./string"
export type { Input } from "./term/input"
export type { Key } from "./term/onKey"
export type {
    AnyCommand,
    AnyOption,
    CLIError,
    CLIInvalidMessageError,
    CLIInvalidOptionError,
    CLIMissingOptionError,
    CLIOptionError,
    CLIOptionsError,
    CLIUnhandledExceptionError,
    CLIUnknownCommandError,
    CLIUnknownOptionError,
    CommandOptions,
    Commands,
    InferOption,
    InferOptions,
    ResolvedCommand,
} from "./types"

export const CLI = {
    ansi,
    boolean,
    command,
    commands,
    console,
    enum: enumI,
    env,
    exec,
    format,
    help,
    prompt,
    resolve,
    run,
    string,
    term,
}
