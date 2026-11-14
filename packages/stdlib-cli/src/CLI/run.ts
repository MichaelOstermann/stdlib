import type { AnyCommand } from "./types"
import { boolean } from "./boolean"
import { help as commandHelp } from "./commands/help"
import { pick as pickCommand } from "./commands/pick"
import { resolve as resolveCommand } from "./commands/resolve"
import { human } from "./env/human"
import { resolve as resolveHelp } from "./help/resolve"
import { resolve as resolveOptions } from "./options/resolve"
import { show } from "./show"

const globalOptions = { help: boolean().desc("Show this help") }
const rootOptions = { ...globalOptions, version: boolean().desc("Show the version") }

/**
 * # run
 *
 * ```ts
 * function CLI.run(command: AnyCommand, input: { name: string, argv?: string[], rpc?: AnyCommand, version?: string }): Promise<void>
 * ```
 *
 * Runs the program `command` is the root of, named `name`, with `argv` from the command line by
 * default: finds the command, reads its options and calls its action. What the action returns is
 * printed with its `.format()`, an `Ok` on stdout, an `Err` on stderr with exit code 1. Anything it
 * throws is printed on stderr with `CLI.show`, with exit code 1.
 *
 * A person at a terminal is asked for the options: all of them when none are given, otherwise the
 * ones that are missing or invalid.
 *
 * A person at a terminal who runs a command without an action, like the program itself, picks one
 * of the commands below it.
 *
 * `--help` anywhere, or a command without an action, prints the help of that command. With a
 * `version`, `--version` after the name of the program prints it.
 *
 * Commands under `rpc` are for programs: they never ask, and print one line of JSON on stdout,
 * `{ "ok": true, "value": … }` or `{ "ok": false, "value": … }`, with what the action returns, what
 * was wrong with the command or its options, or what it threw.
 *
 * ## Example
 *
 * ```ts
 * const rpc = CLI.command().desc("For programs, prints JSON").commands({ members })
 * const miko = CLI.command().commands({ members, rpc })
 *
 * await CLI.run(miko, { name: "miko", rpc, version: "1.2.0" })
 * ```
 */
export async function run(command: AnyCommand, input: { argv?: string[], name: string, rpc?: AnyCommand, version?: string }): Promise<void> {
    write(await output(command, input))
}

type Output = { exitCode?: number, stderr?: string, stdout?: string }

type Action = NonNullable<AnyCommand["config"]["action"]>

async function output(command: AnyCommand, input: { argv?: string[], name: string, rpc?: AnyCommand, version?: string }): Promise<Output> {
    const help = resolveHelp(input.argv ?? process.argv.slice(2))

    const isVersion = help.argv.length === 1 && help.argv[0] === "--version"
    if (input.version !== undefined && isVersion && !help.isHelp) return { stdout: input.version }

    const resolved = resolveCommand({ argv: help.argv, command })
    const isRPC = input.rpc !== undefined && [...resolved.parents, resolved.command].includes(input.rpc)
    if (resolved.error && isRPC) return { stdout: JSON.stringify(Err(resolved.error)) }
    if (resolved.error) return { exitCode: 1, stderr: resolved.message }

    const isPicking = human() && !isRPC && !help.isHelp && !resolved.command.config.action && !resolved.argv.length
    const picked = isPicking ? await pickCommand({ command: resolved.command, path: [input.name, ...resolved.path], rpc: input.rpc }) : undefined
    const target = picked?.command ?? resolved.command

    const action = target.config.action
    if (help.isHelp || !action) {
        const path = [input.name, ...resolved.path]
        const isRoot = !resolved.path.length && input.version !== undefined
        return { stdout: commandHelp({ command: resolved.command, globalOptions: isRoot ? rootOptions : globalOptions, path }) }
    }

    if (isRPC) return rpcOutput(target, action, resolved.argv)
    return terminalOutput(target, action, resolved.argv)
}

async function rpcOutput(command: AnyCommand, action: Action, argv: string[]): Promise<Output> {
    const options = await resolveOptions({ argv, command })
    if (options.error) return { stdout: JSON.stringify(Err(options.error)) }
    try {
        return { stdout: JSON.stringify(await action(options.options)) }
    }
    catch (thrown) {
        const error = thrown instanceof Error ? thrown : new Error(String(thrown))
        return { stdout: JSON.stringify(Err({ message: error.message, stack: error.stack, type: "CLIUnhandledExceptionError" })) }
    }
}

async function terminalOutput(command: AnyCommand, action: Action, argv: string[]): Promise<Output> {
    const options = await resolveOptions({ argv, command, prompt: human() })
    if (options.error) return { exitCode: 1, stderr: options.message }
    try {
        const result = await action(options.options)
        if (!result.ok) return { exitCode: 1, stderr: command.config.format(result) }
        return { stdout: command.config.format(result) }
    }
    catch (thrown) {
        return { exitCode: 1, stderr: show(Error.from(thrown)) }
    }
}

function write(output: Output): void {
    if (output.exitCode) process.exitCode = output.exitCode
    if (output.stdout) process.stdout.write(`${output.stdout}\n`)
    if (output.stderr) process.stderr.write(`${output.stderr}\n`)
}
