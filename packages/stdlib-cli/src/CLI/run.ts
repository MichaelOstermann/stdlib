import type { Command } from "./types"
import { normalize } from "../internals/normalize"
import { format } from "./format"
import { isInteractive } from "./isInteractive"
import { resolve } from "./resolve"

/**
 * # run
 *
 * ```ts
 * function CLI.run(
 *     program: Command,
 *     options?: { argv?: string[], version?: string },
 * ): Promise<void>
 * ```
 *
 * Runs the program with the arguments it was started with: calls the handler of the command they
 * name, or prints its help or the errors.
 *
 * `program` is the command the program itself is: one with a handler and options, or one that
 * groups commands. `argv` defaults to `process.argv.slice(2)`. With a `version`, `--version` prints
 * it.
 *
 * Help goes to stdout. Errors go to stderr and set the exit code to 1, including the help shown
 * when there is nothing to run.
 *
 * ## Example
 *
 * ```ts
 * await CLI.run(CLI.command({
 *     name: "miko",
 *     commands: [members, login],
 * }), { version: "1.2.0" });
 * ```
 */
export async function run(program: Command, options: { argv?: string[], version?: string } = {}): Promise<void> {
    const argv = options.argv ?? process.argv.slice(2)
    // `process.stdout.write` instead of `console.log`, and `stderr` instead of `console.error`, which
    // Bun paints red when colors are forced.
    if (options.version !== undefined && argv.length === 1 && argv[0]!.startsWith("-") && normalize(argv[0]!) === "version") {
        process.stdout.write(`${options.version}\n`)
        return
    }

    const outcome = await resolve(program, argv, { interactive: isInteractive() })
    if (outcome.type === "help") {
        process.stdout.write(`${format(outcome)}\n`)
    }
    else if (outcome.type === "run") {
        await outcome.command.handler!(outcome.values)
    }
    else {
        process.stderr.write(`${format(outcome)}\n`)
        process.exitCode = 1
    }
}
