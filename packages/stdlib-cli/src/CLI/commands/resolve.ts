import type { AnyCommand, ResolvedCommand } from "../types"
import { colors } from "../../internals/colors"
import { Layout } from "../../internals/Layout"
import { suggest } from "../../internals/suggest"

/**
 * # resolve
 *
 * ```ts
 * function CLI.commands.resolve(input: { argv: string[], command: AnyCommand }): ResolvedCommand
 * ```
 *
 * Follows the words at the start of `argv` down the subcommands of `command`, and returns the
 * command it ends at, the names and commands on the way there, and the rest of `argv`. It stops at
 * the first word that starts with `-`, and at a command without subcommands.
 *
 * A word that is not a subcommand returns `error` with the command it got to, and `message` to show
 * for it, with the names it was probably meant to be.
 *
 * ## Example
 *
 * ```ts
 * const resolved = CLI.commands.resolve({ argv: ["members", "add", "--email", "a@b.c"], command: miko })
 * // { argv: ["--email", "a@b.c"], command: add, parents: [miko, members], path: ["members", "add"] }
 *
 * const typo = CLI.commands.resolve({ argv: ["membres"], command: miko })
 * if (typo.error) console.error(typo.message) // membres: Unknown command, did you mean: members?
 * ```
 */
export function resolve(input: { argv: string[], command: AnyCommand }): ResolvedCommand {
    return resolveFrom(input.argv, input.command, [], [])
}

function resolveFrom(argv: string[], command: AnyCommand, parents: AnyCommand[], path: string[]): ResolvedCommand {
    const [next, ...rest] = argv
    const commands = command.config.commands
    if (next === undefined) return { argv, command, parents, path }
    if (next.startsWith("-")) return { argv, command, parents, path }
    if (!Object.keys(commands).length) return { argv, command, parents, path }
    if (Object.hasOwn(commands, next)) return resolveFrom(rest, commands[next]!, [...parents, command], [...path, next])
    return {
        argv,
        command,
        error: { input: next, type: "CLIUnknownCommandError" },
        message: unknownCommandMessage(next, command),
        parents,
        path,
    }
}

function unknownCommandMessage(input: string, command: AnyCommand): string {
    const commands = command.config.commands
    const suggestions = suggest(input, Object.keys(commands))
    const shown = suggestions.length ? suggestions : Object.keys(commands)
    const problem = suggestions.length
        ? `${colors.red("Unknown command")} ${colors.blue(input)}, did you mean: ${suggestions.map(colors.blue).join(", ")}?`
        : `${colors.red("Unknown command")} ${colors.blue(input)}`
    return Layout.paragraphs([
        problem,
        Layout.section("Commands", shown.map((name) => [colors.blue(name), firstLine(commands[name]!.config.desc)])),
    ])
}

function firstLine(text: string | undefined): string {
    return (text ?? "").split("\n")[0]!
}
