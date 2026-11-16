import type { BooleanOption } from "./boolean"
import type { EnumOption } from "./enum"
import type { StringOption, StringValue } from "./string"

export type Flag = string | null
export type AnyOption = BooleanOption | EnumOption<any, boolean> | StringOption<any, boolean, boolean>

export interface AnyCommand {
    readonly kind: "command"
    readonly config: {
        action: ((options: any) => unknown) | undefined
        commands: Commands
        desc?: string
        options: CommandOptions
    }
    commands: (commands: Commands) => AnyCommand
}

export type Commands = Record<string, AnyCommand>
export type CommandOptions = Record<string, AnyOption>
export type ResolvedCommand = { command: AnyCommand, parents: AnyCommand[], path: string[] }

export type InferOptions<X> = X extends { config: { options: infer O } } ? InferOptions<O> : { -readonly [K in keyof X]: InferOption<X[K]> }
export type InferOption<O> = O extends StringOption<infer T, infer Optional, infer Defaulted>
    ? StringValue<T, Optional, Defaulted>
    : O extends BooleanOption
        ? boolean
        : O extends EnumOption<infer K, boolean>
            ? K
            : unknown

export type CLIUnknownCommandError = { message: string, name: "CLIUnknownCommandError" }
export type CLIInvalidOptionError = { message: string, meta: { option: string }, name: "CLIInvalidOptionError" }
export type CLIMissingOptionError = { message: string, meta: { option: string }, name: "CLIMissingOptionError" }
export type CLIUnknownOptionError = { message: string, meta: { option: string }, name: "CLIUnknownOptionError" }
export type CLIOptionError = CLIInvalidOptionError | CLIMissingOptionError | CLIUnknownOptionError
export type CLIOptionsError = { errors: CLIOptionError[], message: string, name: "CLIOptionsError" }
export type CLIUnhandledExceptionError = { cause: Failure, message: string, name: "CLIUnhandledExceptionError" }
export type CLIInvalidMessageError = { message: string, name: "CLIInvalidMessageError" }
export type CLIError = CLIOptionsError | CLIUnhandledExceptionError | CLIUnknownCommandError
