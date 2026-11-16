import type { CommandOptions, Commands, InferOptions } from "./types"

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

/** What an action can return: `Ok` with JSON, `Err` with what went wrong, or nothing. */
export type ActionReturn = Result<JSONValue, Failure | Error | string> | void

/**
 * # command
 *
 * A command with options, subcommands and an action. Its name is its key in `.commands()` of its
 * parent.
 *
 * The action gets the values of the options and returns `Ok` with JSON, `Err` with what went wrong,
 * or nothing.
 *
 * ## Example
 *
 * ```ts
 * const add = CLI.command()
 *     .desc("Add a member")
 *     .options({
 *         email: CLI.string().desc("Their email address"),
 *         firstName: CLI.string().desc("Their first name").optional(true),
 *     })
 *     .action(({ email }) => {
 *         if (email.endsWith("@example.com")) return Err("Not a real address")
 *         return Ok({ email })
 *     })
 *
 * const members = CLI.command()
 *     .desc("Manage who has access")
 *     .commands({ add })
 * ```
 */
export function command(): Command {
    return build({ action: undefined, commands: {}, options: {} })
}

type Config = {
    action: ((options: any) => unknown) | undefined
    commands: Commands
    desc?: string
    options: CommandOptions
}

function build(config: Config): never {
    const command = {
        config,
        kind: "command",
        commands: (commands: Commands) => build({ ...config, commands }),
        desc: (desc: string) => build({ ...config, desc }),
        ...config.action ? {} : {
            action: (action: Config["action"]) => build({ ...config, action }),
            options: (options: CommandOptions) => build({ ...config, options }),
        },
    }
    return command as never
}
