import type { AnyCommand, ResolvedCommand } from "../types"

/**
 * # nearest
 *
 * The command `path` leads to, or the last one found on the way.
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
