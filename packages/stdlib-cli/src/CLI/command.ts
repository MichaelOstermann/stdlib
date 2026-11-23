import type { CLI } from "."

/**
 * # command
 *
 * Creates a command with options, subcommands and an action. The name of the command is its key in
 * the `.commands()` of the parent.
 *
 * The action receives the option values. The action returns `Ok` with JSON, `Err` with the problem,
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
export function command(): CLI.Command {
    return build({ action: undefined, commands: {}, options: {} })
}

type Config = {
    action: ((options: any) => unknown) | undefined
    commands: CLI.Commands
    desc?: string
    options: CLI.CommandOptions
}

function build(config: Config): never {
    const command = {
        config,
        kind: "command",
        commands: (commands: CLI.Commands) => build({ ...config, commands }),
        desc: (desc: string) => build({ ...config, desc }),
        ...config.action ? {} : {
            action: (action: Config["action"]) => build({ ...config, action }),
            options: (options: CLI.CommandOptions) => build({ ...config, options }),
        },
    }
    return command as never
}
