import type { InferErr, InferOk } from "@monstermann/stdlib"
import type { Parse } from "../internals/Parse"

export interface StringOption<T = string, Optional extends boolean = false, Defaulted extends boolean = false> {
    readonly config: StringOptionConfig<T>
    readonly kind: "string"
    default: (value: string) => StringOption<T, Optional, true>
    desc: (desc: string) => StringOption<T, Optional, Defaulted>
    example: (example: string) => StringOption<T, Optional, Defaulted>
    optional: <O extends boolean>(optional: O) => StringOption<T, O, Defaulted>
    parse: <U>(parse: Parse<U>) => StringOption<U, Optional, Defaulted>
}

export interface StringOptionConfig<T> {
    default?: string
    desc?: string
    example?: string
    optional: boolean
    parse: Parse<T>
}

export interface BooleanOption {
    readonly config: BooleanOptionConfig
    readonly kind: "boolean"
    default: (value: boolean) => BooleanOption
    desc: (desc: string) => BooleanOption
}

export interface BooleanOptionConfig {
    default: boolean
    desc?: string
}

export interface EnumOption<K extends string = never, Defaulted extends boolean = false> {
    readonly config: EnumOptionConfig<K>
    readonly kind: "enum"
    default: (value: K) => EnumOption<K, true>
    desc: (desc: string) => EnumOption<K, Defaulted>
    options: <const C extends Record<string, string>>(options: C) => EnumOption<keyof C & string, false>
}

export interface EnumOptionConfig<K extends string> {
    default?: K
    desc?: string
    options: Record<K, string>
}

export type CommandOption =
    | { kind: "boolean", config: BooleanOptionConfig }
    | { kind: "enum", config: EnumOptionConfig<string> }
    | { kind: "string", config: StringOptionConfig<unknown> }

export type CommandOptions = Record<string, CommandOption>

export type Commands = Record<string, AnyCommand>

export interface Command<
    O extends CommandOptions = Record<never, never>,
    C extends Commands = Record<never, never>,
    T = never,
    E = never,
    HasAction extends boolean = false,
> {
    readonly config: CommandConfig<O, C, T, E, HasAction>
    readonly kind: "command"
    action: <R extends Result<unknown, unknown> | void>(action: (options: InferOptions<O>) => R | Promise<R>) => Command<O, C, ActionValue<R>, ActionError<R>, true>
    commands: <const C extends Commands>(commands: C) => Command<O, C, T, E, HasAction>
    desc: (desc: string) => Command<O, C, T, E, HasAction>
    options: <const O extends CommandOptions>(options: O) => Command<O, C, never, never, false>
}

export interface CommandConfig<O extends CommandOptions, C extends Commands, T, E, HasAction extends boolean> {
    action: HasAction extends true ? (options: InferOptions<O>) => Promise<Result<T, E>> : undefined
    commands: C
    desc?: string
    options: O
}

export type ActionValue<R> = InferOk<Exclude<R, void>> | (undefined extends R ? void : never)
export type ActionError<R> = InferErr<Exclude<R, void>>

export interface AnyCommand {
    kind: "command"
    config: {
        action: ((options: never) => Promise<Result<unknown, unknown>>) | undefined
        commands: Commands
        desc?: string
        options: CommandOptions
    }
}

export type InferOptions<X> = X extends { config: { options: infer O } } ? InferOptions<O> : { [K in keyof X]: InferOption<X[K]> }

export type InferOption<O> = O extends StringOption<infer T, infer Optional, infer Defaulted>
    ? Value<T, Optional, Defaulted>
    : O extends BooleanOption
        ? boolean
        : O extends EnumOption<infer K, boolean>
            ? K
            : never

type Value<T, Optional, Defaulted> = Defaulted extends true
    ? T
    : Optional extends true
        ? T | undefined
        : T

export type CLIUnknownCommandError = { input: string, type: "CLIUnknownCommandError" }

export type ResolvedCommand =
    | { argv: string[], command: AnyCommand, error?: undefined, message?: undefined, parents: AnyCommand[], path: string[] }
    | { argv: string[], command: AnyCommand, error: CLIUnknownCommandError, message: string, parents: AnyCommand[], path: string[] }

export type CLIInvalidOptionError = { message: string, option: string, type: "CLIInvalidOptionError" }
export type CLIMissingOptionError = { option: string, type: "CLIMissingOptionError" }
export type CLIMissingValueError = { option: string, type: "CLIMissingValueError" }
export type CLIUnknownOptionError = { input: string, type: "CLIUnknownOptionError" }
export type CLIOptionError = CLIInvalidOptionError | CLIMissingOptionError | CLIMissingValueError | CLIUnknownOptionError
export type CLIOptionsError = { errors: CLIOptionError[], type: "CLIOptionsError" }

/** What `CLI.options.resolve` read: the values for `action`, or what was wrong. */
export type ResolvedOptions<C> =
    | { error?: undefined, message?: undefined, options: InferOptions<C> }
    | { error: CLIOptionsError, message: string, options?: undefined }

export type CLIUnhandledExceptionError = { message: string, stack?: string, type: "CLIUnhandledExceptionError" }

/**
 * The commands of `X` with an action, nested like they are, each as a function that takes its
 * options as they are typed, before they are parsed, and returns what its action returns.
 */
export type InferRPC<X> = X extends { config: { action: infer A, commands: infer C, options: infer O } }
    ? keyof RPCCommands<C> extends never
        ? RPCAction<A, O>
        : RPCAction<A, O> & RPCCommands<C>
    : never

type RPCCommands<C> = RPCSimplify<{ -readonly [K in keyof C as RPCHasAction<C[K]> extends true ? K : never]: InferRPC<C[K]> }>

type RPCAction<A, O> = A extends (options: never) => Promise<infer R>
    ? (options: RPCOptions<O>) => Promise<Result<InferOk<R>, InferErr<R> | CLIOptionsError | CLIUnhandledExceptionError | CLIUnknownCommandError>>
    : unknown

type RPCHasAction<X> = X extends { config: { action: infer A, commands: infer C } }
    ? A extends undefined
        ? true extends { [K in keyof C]: RPCHasAction<C[K]> }[keyof C]
            ? true
            : false
        : true
    : false

type RPCOptions<O> = RPCSimplify<
    & { -readonly [K in keyof O as RPCRequired<O[K]> extends true ? K : never]: RPCOption<O[K]> }
    & { -readonly [K in keyof O as RPCRequired<O[K]> extends true ? never : K]?: RPCOption<O[K]> }
>

type RPCOption<O> = O extends StringOption<unknown, boolean, boolean>
    ? string
    : O extends BooleanOption
        ? boolean
        : O extends EnumOption<infer K, boolean>
            ? K
            : never

type RPCRequired<O> = O extends StringOption<unknown, infer Optional, infer Defaulted>
    ? Optional extends true
        ? false
        : Defaulted extends true
            ? false
            : true
    : O extends EnumOption<infer _K, infer Defaulted>
        ? Defaulted extends true
            ? false
            : true
        : false

type RPCSimplify<T> = { [K in keyof T]: T[K] } & {}
