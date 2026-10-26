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
    /** Turns the given value into what the handler gets. Throws, or rejects, when it is invalid. */
    parse: (value: string) => unknown
}

/** What came out of reading argv, before anything is printed or run. */
export type Outcome =
    | { type: "error", command: Command, errors: CLIError[], path: string[] }
    | { type: "help", command: Command, path: string[] }
    | { type: "run", command: Command, path: string[], values: Record<string, unknown> }

// Plain objects instead of `Error` subclasses: `JSON.stringify(new Error())` is `{}`.
export type CLIError =
    | { type: "AmbiguousCommand", candidates: Command[], value: string }
    | { type: "AmbiguousFlag", candidates: string[], value: string }
    | { type: "InvalidFlag", message: string, name: string }
    | { type: "MissingFlag", name: string }
    | { type: "UnexpectedArgument", value: string }
    | { type: "UnknownCommand", value: string }
    | { type: "UnknownFlag", value: string }
