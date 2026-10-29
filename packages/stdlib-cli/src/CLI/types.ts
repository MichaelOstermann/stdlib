import type { Token } from "../internals/Tokens"

export interface Command {
    commands: Command[]
    /** A short, one line description. */
    desc: string
    /** A disabled command does not exist: it can't be run, and help does not show it. */
    enabled: boolean
    handler: ((values: Record<string, unknown>) => unknown) | undefined
    /** A hidden command can be run, but only by its exact name, and help does not show it. */
    hidden: boolean
    name: string
    options: Record<string, Option>
}

export interface Option {
    /**
     * Used when the flag is missing, passed through `parse` like a given value, and shown in help
     * as it is.
     */
    default: string | undefined
    // TODO jsdoc
    desc: string
    /** A disabled option does not exist: it can't be given, and help does not show it. */
    enabled: boolean
    /** A value as someone would type it, eg. `25m`, shown in help and next to an invalid value. */
    example: string | undefined
    /** A hidden option can be given, but only by its exact name, and help does not show it. */
    hidden: boolean
    /** A missing flag is `undefined` instead of a `MissingFlagError`. */
    optional: boolean
    /** What help shows after the flag for its value, `<value>` by default, nothing for a switch. */
    usage: string
    /** Turns the given value into what the handler gets. Throws, or rejects, when it is invalid. */
    parse: (value: string) => unknown
    /**
     * Takes the value of the flag from the words after it, removing the ones it takes, and
     * `undefined` when there is none. By default every word up to the next flag, joined with
     * spaces.
     */
    read: (token: Token) => string | undefined
}

/**
 * What came out of reading argv, before anything is printed or run. `path` is the command as it is
 * typed, starting with the name of the program.
 */
export type Outcome =
    | { type: "error", command: Command, errors: CLIError[], path: string[] }
    | { type: "help", command: Command, path: string[] }
    | { type: "run", command: Command, path: string[], values: Record<string, unknown> }

// Plain objects instead of `Error` subclasses: `JSON.stringify(new Error())` is `{}`.
export type CLIError =
    | { type: "InvalidFlag", message: string, name: string }
    | { type: "MissingFlag", name: string }
    /** A command that only groups others, or that was given nothing and can't run without it. */
    | { type: "NothingToRun" }
    | { type: "RepeatedFlag", name: string }
    | { type: "UnknownCommand", candidates: Command[], value: string }
    | { type: "UnknownFlag", candidates: string[], value: string }
