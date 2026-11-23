import type { Result } from "@monstermann/stdlib"
import type { CLI } from "."
import { Err, Ok } from "@monstermann/stdlib"
import { nearestCommand } from "./nearestCommand"

/**
 * # resolveCommand
 *
 * Returns the command that `path` leads to, or `CLIUnknownCommandError`.
 *
 * ## Example
 *
 * ```ts
 * CLI.resolveCommand(miko, ["members", "add"]) // Ok({ command: add, parents: [miko, members], path: ["members", "add"] })
 * CLI.resolveCommand(miko, ["membres"]) // Err({ message: "Unknown command membres", name: "CLIUnknownCommandError" })
 * ```
 */
export function resolveCommand(root: CLI.AnyCommand, path: string[]): Result<CLI.ResolvedCommand, CLI.UnknownCommandError> {
    const found = nearestCommand(root, path)
    if (found.path.length < path.length) return Err<CLI.UnknownCommandError>({ message: `Unknown command ${path[found.path.length]}`, name: "CLIUnknownCommandError" })
    return Ok(found)
}
