import type { Command, CommandConfig, CommandOption, CommandOptions, Commands, MergeOptions } from "./types"

/**
 * # command
 *
 * ```ts
 * function CLI.command(): Command
 * ```
 *
 * A command: its options, its subcommands and what it does. Its name is the key it gets in
 * `.commands()` of its parent. Each call returns a new command, so one can be the base of others.
 *
 * `.option()` adds one option, `.options()` several, after the ones that are there, which is the
 * order they are asked for in. One of the same name replaces the one before.
 *
 * `.action()` receives the values of the options. When it returns nothing, that counts as `Ok()`.
 * Adding options drops the action, it was written for the options before.
 *
 * ## Example
 *
 * ```ts
 * const add = CLI.command()
 *     .desc("Add a member")
 *     .option("email", CLI.string().desc("Their email address"))
 *     .option("firstName", CLI.string().desc("Their first name").optional(true))
 *     .action(({ email }) => {
 *         if (email.endsWith("@example.com")) return Err("Not a real address")
 *         return Ok({ email })
 *     })
 *
 * const members = CLI.command()
 *     .desc("Manage who has access")
 *     .commands({ add })
 *
 * await add.config.action({ email: "john@miko.dev" }) // Ok({ email: "john@miko.dev" })
 * ```
 */
export function command(): Command {
    return build({ action: undefined, commands: {}, options: {} })
}

function build<O extends CommandOptions, C extends Commands, T, E, HasAction extends boolean>(
    config: CommandConfig<O, C, T, E, HasAction>,
): Command<O, C, T, E, HasAction> {
    return {
        config,
        kind: "command",
        commands: (commands) => build({ ...config, commands }),
        desc: (desc) => build({ ...config, desc }),
        action: (action) => build({
            ...config,
            action: async (options) => (await action(options) ?? Ok()) as Result<never, never>,
        }),
        option: <N extends string, X extends CommandOption>(name: N, option: X) => build({
            ...config,
            action: undefined,
            options: { ...config.options, [name]: option } as MergeOptions<O, Record<N, X>>,
        }),
        options: <P extends CommandOptions>(options: P) => build({
            ...config,
            action: undefined,
            options: { ...config.options, ...options } as MergeOptions<O, P>,
        }),
    }
}
