import type { Command } from "./types"
import { format } from "./format"
import { isInteractive } from "./isInteractive"
import { resolve } from "./resolve"

/**
 * # run
 *
 * ```ts
 * function CLI.run(
 *     program: Command,
 *     options?: { argv?: string[] },
 * ): Promise<void>
 * ```
 *
 * Runs the program with the arguments it was started with: calls the handler of the command they
 * name, prints the help of a command that only groups others, or prints the errors and sets the
 * exit code to 1.
 *
 * `program` is the command the program itself is: one with a handler and options, or one that
 * groups commands. `argv` defaults to `process.argv.slice(2)`.
 *
 * ## Example
 *
 * ```ts
 * await CLI.run(CLI.command({
 *     name: "miko",
 *     commands: [members, login],
 * }));
 * ```
 */
export async function run(program: Command, options: { argv?: string[] } = {}): Promise<void> {
    const outcome = await resolve(program, options.argv ?? process.argv.slice(2), { interactive: isInteractive() })
    // `process.stderr.write` instead of `console.error`, which Bun paints red when colors are forced.
    if (outcome.type === "help") {
        process.stdout.write(`${format(outcome)}\n`)
    }
    else if (outcome.type === "error") {
        process.stderr.write(`${format(outcome)}\n`)
        process.exitCode = 1
    }
    else {
        await outcome.command.handler!(outcome.values)
    }
}
