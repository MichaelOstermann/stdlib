import type { Failure, JSON, Result, Signal } from "@monstermann/stdlib"
import type { Parse } from "../internals/Parse"
import { bgBlack } from "./bgBlack"
import { bgBlue } from "./bgBlue"
import { bgCyan } from "./bgCyan"
import { bgGreen } from "./bgGreen"
import { bgMagenta } from "./bgMagenta"
import { bgRed } from "./bgRed"
import { bgWhite } from "./bgWhite"
import { bgYellow } from "./bgYellow"
import { black } from "./black"
import { blue } from "./blue"
import { bold } from "./bold"
import { boolean } from "./boolean"
import { command } from "./command"
import { commandHelp } from "./commandHelp"
import { confirm } from "./confirm"
import { cyan } from "./cyan"
import { dim } from "./dim"
import { enum as enumOption } from "./enum"
import { exec } from "./exec"
import { formatError } from "./formatError"
import { formatExec } from "./formatExec"
import { formatJSON } from "./formatJSON"
import { green } from "./green"
import { hasColor } from "./hasColor"
import { input } from "./input"
import { inverse } from "./inverse"
import { isAgent } from "./isAgent"
import { isCI } from "./isCI"
import { isHuman } from "./isHuman"
import { italic } from "./italic"
import { magenta } from "./magenta"
import { nearestCommand } from "./nearestCommand"
import { onKey } from "./onKey"
import { optionHelp } from "./optionHelp"
import { optionsHelp } from "./optionsHelp"
import { pickableCommands } from "./pickableCommands"
import { prompt } from "./prompt"
import { promptCommand } from "./promptCommand"
import { promptOption } from "./promptOption"
import { promptOptions } from "./promptOptions"
import { red } from "./red"
import { redirectConsole } from "./redirectConsole"
import { render } from "./render"
import { resolveArgv } from "./resolveArgv"
import { resolveCommand } from "./resolveCommand"
import { resolveOption } from "./resolveOption"
import { resolveOptions } from "./resolveOptions"
import { run } from "./run"
import { select } from "./select"
import { setColor } from "./setColor"
import { strikethrough } from "./strikethrough"
import { string } from "./string"
import { underline } from "./underline"
import { white } from "./white"
import { yellow } from "./yellow"

export namespace CLI {
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

    export type UnknownCommandError = { message: string, name: "CLIUnknownCommandError" }

    export type InvalidOptionError = { message: string, meta: { option: string }, name: "CLIInvalidOptionError" }

    export type MissingOptionError = { message: string, meta: { option: string }, name: "CLIMissingOptionError" }

    export type UnknownOptionError = { message: string, meta: { option: string }, name: "CLIUnknownOptionError" }

    export type OptionError = InvalidOptionError | MissingOptionError | UnknownOptionError

    export type OptionsError = { errors: OptionError[], message: string, name: "CLIOptionsError" }

    export type InternalError = { cause: Failure, message: string, name: "CLIInternalError" }

    export type InvalidMessageError = { message: string, name: "CLIInvalidMessageError" }

    export type Error = OptionsError | InternalError | UnknownCommandError

    export interface Command<O extends CommandOptions = Record<never, never>, C extends Commands = Record<never, never>> {
        readonly config: CommandConfig<O, C>
        readonly kind: "command"
        action: <R extends ActionReturn>(action: (options: InferOptions<O>) => R | Promise<R>) => ActionCommand<O, C, R>
        commands: <const C extends Commands>(commands: C) => Command<O, C>
        desc: (desc: string) => Command<O, C>
        options: <const P extends CommandOptions>(options: P) => Command<P, C>
    }

    export interface CommandConfig<O extends CommandOptions, C extends Commands> {
        action: undefined
        commands: C
        desc?: string
        options: O
    }

    export interface ActionCommand<O extends CommandOptions, C extends Commands, R extends ActionReturn> {
        readonly config: ActionCommandConfig<O, C, R>
        readonly kind: "command"
        commands: <const C extends Commands>(commands: C) => ActionCommand<O, C, R>
        desc: (desc: string) => ActionCommand<O, C, R>
    }

    export interface ActionCommandConfig<O extends CommandOptions, C extends Commands, R extends ActionReturn> {
        commands: C
        desc?: string
        options: O
        action: (options: InferOptions<O>) => R | Promise<R>
    }

    /** An action returns `Ok` with JSON, `Err` with the problem, or nothing. */
    export type ActionReturn = Result<JSON, Failure | globalThis.Error | string> | void

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

    export interface StringOption<T = string, Optional extends boolean = false, Defaulted extends boolean = false> {
        readonly config: StringOptionConfig<T>
        readonly kind: "string"
        default: {
            (value: string): StringOption<T, Optional, true>
            (value: string | undefined): StringOption<T, Optional, Defaulted>
        }
        desc: (desc: string) => StringOption<T, Optional, Defaulted>
        example: (example: string) => StringOption<T, Optional, Defaulted>
        optional: <O extends boolean>(optional: O) => StringOption<T, O, Defaulted>
        parse: <U>(parse: Parse<U>) => StringOption<U, Optional, Defaulted>
        sensitive: (sensitive: boolean) => StringOption<T, Optional, Defaulted>
    }

    export interface StringOptionConfig<T> {
        default?: string
        desc?: string
        example?: string
        optional: boolean
        parse: Parse<T>
        sensitive: boolean
    }

    export type StringValue<T, Optional, Defaulted> = Defaulted extends true
        ? T
        : Optional extends true
            ? T | undefined
            : T

    /** The result of `CLI.exec`. */
    export type Execution = {
        argv: ResolvedArgv
        command: ResolvedCommand | undefined
        isHelp: boolean
        isRPC: boolean
        /** What people type to run the program. */
        name: string
        options: Record<string, unknown> | undefined
        program: AnyCommand
        result: Result<JSON, Error | Failure>
    }

    /** The result of `CLI.resolveArgv`. */
    export type ResolvedArgv = {
        flags: Record<string, ResolvedFlag[]>
        hasFlags: boolean
        isHelp: boolean
        path: string[]
        words: string[]
    }

    /**
     * One use of a flag. `index` is the position in `words`. `inline` is `true` for
     * `--email=a@b.c`.
     */
    export type ResolvedFlag = { index: number, inline: boolean, value: Flag }

    export interface FormatOptions {
        /**
         * Prints one line like `{ email: jane@miko.dev, seats: 1 }` when the value fits into
         * `width`. Off by default.
         */
        compact?: boolean
        /**
         * How many items of an array or object to show. The rest becomes `… 3 more`. 100 by
         * default.
         */
        maxItems?: number
        /**
         * How many characters of a string to show. The rest becomes `… 3 more characters`. 1000 by
         * default.
         */
        maxString?: number
        /** How many columns the text may use. Defaults to the width of the terminal. */
        width?: number
    }

    export interface PromptOptions {
        footer?: PromptSlot
        header?: PromptSlot
        /** The value at the start. */
        initial?: string
        /** Drawn in place of each character, like `*` for a password. */
        mask?: string
        /** Shown dimmed while there is no value. */
        placeholder?: string
        prefix?: PromptSlot
        suffix?: PromptSlot
    }

    /**
     * Returns the lines to draw. `done` is `true` after the value was accepted. Returning nothing
     * draws nothing.
     */
    export type PromptSlot = (input: Input, done: boolean) => string | null | undefined | void

    export interface ConfirmOptions {
        footer?: ConfirmSlot
        header?: ConfirmSlot
        /** The answer selected at the start. Defaults to `false`. */
        initial?: boolean
        prefix?: ConfirmSlot
        suffix?: ConfirmSlot
        /**
         * Draws the answers between `prefix` and `suffix`. `value` is the answer that Enter picks.
         */
        answer?: (value: boolean, done: boolean) => string
    }

    /**
     * Returns the lines to draw. `done` is `true` after `value` was picked. Returning nothing draws
     * nothing.
     */
    export type ConfirmSlot = (value: boolean, done: boolean) => string | null | undefined | void

    export interface SelectOptions<K extends string> {
        choices: readonly K[]
        footer?: SelectSlot<K>
        header?: SelectSlot<K>
        /** The choice selected at the start. */
        initial?: K
        /** Draws the line of one choice. `active` is `true` for the choice that Enter picks. */
        choice?: (key: K, active: boolean) => string
    }

    /**
     * Returns the lines to draw. `done` is `true` after `active` was picked and the choices are
     * hidden.
     */
    export type SelectSlot<K extends string> = (active: K, done: boolean) => string | null | undefined | void

    export interface Input {
        (width: number): string
        $cursor: Signal<number>
        /** The problem with the value. The code that checks the value sets this. */
        $error: Signal<string | undefined>
        $value: Signal<string>
        clear: () => void
        deleteNextChar: () => void
        deleteNextWord: () => void
        deletePrevChar: () => void
        deletePrevWord: () => void
        goToEnd: () => void
        goToNextChar: () => void
        goToNextWord: () => void
        goToPrevChar: () => void
        goToPrevWord: () => void
        goToStart: () => void
        insertText: (text: string) => void
        onKey: (key: Key) => boolean
    }

    export interface Key {
        alt: boolean
        ctrl: boolean
        /**
         * The name of the key, as a browser names it: `"a"`, `"A"`, `" "`, `"Enter"`,
         * `"ArrowLeft"`, or `"Paste"`.
         */
        name: string
        shift: boolean
        /** The text the key types: a character, the pasted text, or `""`. */
        text: string
    }
}

export const CLI = {
    bgBlack,
    bgBlue,
    bgCyan,
    bgGreen,
    bgMagenta,
    bgRed,
    bgWhite,
    bgYellow,
    black,
    blue,
    bold,
    boolean,
    command,
    commandHelp,
    confirm,
    cyan,
    dim,
    enum: enumOption,
    exec,
    formatError,
    formatExec,
    formatJSON,
    green,
    hasColor,
    input,
    inverse,
    isAgent,
    isCI,
    isHuman,
    italic,
    magenta,
    nearestCommand,
    onKey,
    optionHelp,
    optionsHelp,
    pickableCommands,
    prompt,
    promptCommand,
    promptOption,
    promptOptions,
    red,
    redirectConsole,
    render,
    resolveArgv,
    resolveCommand,
    resolveOption,
    resolveOptions,
    run,
    select,
    setColor,
    strikethrough,
    string,
    underline,
    white,
    yellow,
}
