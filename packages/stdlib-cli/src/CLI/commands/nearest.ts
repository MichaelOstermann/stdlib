import type { AnyCommand, ResolvedCommand } from "../types"

/**
 * # nearest
 *
 * Returns the command that `path` leads to. When a word of `path` is unknown, returns the last
 * command found before that word.
 *
 * ## Example
 *
 * ```ts
 * CLI.commands.nearest(miko, ["members", "nope"])
 * // { command: members, parents: [miko], path: ["members"] }
 * ```
 */
export function nearest(root: AnyCommand, path: string[]): ResolvedCommand {
    let resolved: ResolvedCommand = { command: root, parents: [], path: [] }
    for (const name of path) {
        if (!Object.hasOwn(resolved.command.config.commands, name)) return resolved
        resolved = {
            command: resolved.command.config.commands[name]!,
            parents: [...resolved.parents, resolved.command],
            path: [...resolved.path, name],
        }
    }
    return resolved
}
