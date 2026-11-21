import type { Result } from "@monstermann/stdlib"
import type { AnyCommand, CLIUnknownCommandError, ResolvedCommand } from "../types"
import { Err, Ok } from "@monstermann/stdlib"
import { nearest } from "../commands/nearest"

/**
 * # command
 *
 * The command `path` leads to, or `CLIUnknownCommandError`.
 *
 * ## Example
 *
 * ```ts
 * CLI.resolve.command(miko, ["members", "add"]) // Ok({ command: add, parents: [miko, members], path: ["members", "add"] })
 * CLI.resolve.command(miko, ["membres"]) // Err({ message: "Unknown command membres", name: "CLIUnknownCommandError" })
 * ```
 */
export function command(root: AnyCommand, path: string[]): Result<ResolvedCommand, CLIUnknownCommandError> {
    const found = nearest(root, path)
    if (found.path.length < path.length) return Err<CLIUnknownCommandError>({ message: `Unknown command ${path[found.path.length]}`, name: "CLIUnknownCommandError" })
    return Ok(found)
}
