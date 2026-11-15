import type { ActionCommand, ActionCommandConfig, ActionError, ActionValue, Command, CommandConfig, CommandOption, CommandOptions, Commands, InferOptions, MergeOptions } from "./types"
import { formatFailure } from "./formatFailure"
import { formatJSON } from "./formatJSON"

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
 * `.action()` receives the values of the options, and returns `Ok` with JSON, or `Err` with a
 * `Failure`, an `Error` or a string, which `Failure.from` turns into a `Failure`. When it returns
 * nothing, that counts as `Ok(null)`. It comes after the options, and only once.
 *
 * `.format()` turns the `Result` into what a terminal shows, an `Ok` on stdout and an `Err` on
 * stderr, with `CLI.formatJSON` and `CLI.formatFailure` by default. After `.action()`, it receives
 * what the action returns.
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
 *     .format((result) => result.ok ? `Added ${result.value.email}` : result.value.message)
 *
 * const members = CLI.command()
 *     .desc("Manage who has access")
 *     .commands({ add })
 *
 * await add.config.action({ email: "john@miko.dev" }) // Ok({ email: "john@miko.dev" })
 * ```
 */
export function command(): Command {
    return build({ action: undefined, commands: {}, format: formatResult, options: {} })
}

function formatResult(result: Result<JSONValue, Failure>): string {
    if (!result.ok) return formatFailure(result.value)
    if (result.value === null) return ""
    return formatJSON(result.value)
}

function build<O extends CommandOptions, C extends Commands>(config: CommandConfig<O, C>): Command<O, C> {
    return {
        config,
        kind: "command",
        commands: (commands) => build({ ...config, commands }),
        desc: (desc) => build({ ...config, desc }),
        format: (format) => build({ ...config, format }),
        action: <R extends Result<JSONValue, Failure | Error | string> | void>(action: (options: InferOptions<O>) => R | Promise<R>) => buildAction<O, C, ActionValue<R>, ActionError<R>>({
            ...config,
            action: async (options) => {
                const result = (await action(options) ?? Ok(null)) as Result<JSONValue, Failure | Error | string>
                if (result.ok) return result as never
                return Err(Failure.from(result.value)) as never
            },
        }),
        option: <N extends string, X extends CommandOption>(name: N, option: X) => build({
            ...config,
            options: { ...config.options, [name]: option } as MergeOptions<O, Record<N, X>>,
        }),
        options: <P extends CommandOptions>(options: P) => build({
            ...config,
            options: { ...config.options, ...options } as MergeOptions<O, P>,
        }),
    }
}

function buildAction<O extends CommandOptions, C extends Commands, T extends JSONValue, E extends Failure>(
    config: ActionCommandConfig<O, C, T, E>,
): ActionCommand<O, C, T, E> {
    return {
        config,
        kind: "command",
        commands: (commands) => buildAction({ ...config, commands }),
        desc: (desc) => buildAction({ ...config, desc }),
        format: (format) => buildAction({ ...config, format }),
    }
}
