import type { AnyCommand, ResolvedCommand } from "./types"
import { colors } from "../internals/colors"
import { boolean } from "./boolean"
import { help as commandHelp } from "./commands/help"
import { pick as pickCommand } from "./commands/pick"
import { resolve as resolveCommand } from "./commands/resolve"
import { human } from "./env/human"
import { resolve as resolveHelp } from "./help/resolve"
import { resolve as resolveOptions } from "./options/resolve"

const globalOptions = { help: boolean().desc("Show this help") }
const rootOptions = { ...globalOptions, version: boolean().desc("Show the version") }

/**
 * # run
 *
 * ```ts
 * function CLI.run(command: AnyCommand, input: { name: string, argv?: string[], encode?: Encode, rpc?: AnyCommand, version?: string }): Promise<void>
 * ```
 *
 * Runs the program `command` is the root of, named `name`, with `argv` from the command line by
 * default: finds the command, reads its options and calls its action. What the action returns is
 * printed, an `Err` and anything thrown on stderr, with exit code 1.
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
 * Commands under `rpc` are for programs: they never ask, and print what the action returns, what
 * was wrong with the command or its options, or what it or `encode` threw, on stdout. `encode`
 * turns that `Result` into what is printed, one line of JSON by default:
 * `{ "ok": true, "value": … }` or `{ "ok": false, "value": … }`.
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
export async function run(command: AnyCommand, input: { argv?: string[], encode?: Encode, name: string, rpc?: AnyCommand, version?: string }): Promise<void> {
    const help = resolveHelp(input.argv ?? process.argv.slice(2))
    const encode = input.encode ?? ((result) => `${JSON.stringify(result)}\n`)

    const isVersion = help.argv.length === 1 && help.argv[0] === "--version"
    if (input.version !== undefined && isVersion && !help.isHelp) {
        process.stdout.write(`${input.version}\n`)
        return
    }

    const resolved = resolveCommand({ argv: help.argv, command })
    const isRPC = input.rpc !== undefined && [...resolved.parents, resolved.command].includes(input.rpc)
    if (resolved.error && isRPC) {
        process.stdout.write(encode(Err(resolved.error)))
        return
    }
    if (resolved.error) {
        process.exitCode = 1
        process.stderr.write(`${resolved.message}\n`)
        return
    }

    const isPicking = human() && !isRPC && !help.isHelp && !resolved.command.config.action && !resolved.argv.length
    const picked = isPicking ? await pickCommand({ command: resolved.command, path: [input.name, ...resolved.path], rpc: input.rpc }) : undefined
    const target = picked?.command ?? resolved.command

    const action = target.config.action
    if (help.isHelp || !action) {
        const path = [input.name, ...resolved.path]
        const isRoot = !resolved.path.length && input.version !== undefined
        process.stdout.write(`${commandHelp({ command: resolved.command, globalOptions: isRoot ? rootOptions : globalOptions, path })}\n`)
        return
    }

    if (isRPC) {
        process.stdout.write(await call(action, resolved, encode))
        return
    }

    const options = await resolveOptions({ argv: resolved.argv, command: target, prompt: human() })
    if (options.error) {
        process.exitCode = 1
        process.stderr.write(`${options.message}\n`)
        return
    }

    try {
        const result = await action(options.options as never)
        if (!result.ok) process.exitCode = 1
        if (!result.ok) process.stderr.write(`${colors.red(text(result.value))}\n`)
        if (result.ok && result.value !== undefined) process.stdout.write(`${text(result.value)}\n`)
    }
    catch (thrown) {
        process.exitCode = 1
        const error = thrown instanceof Error ? thrown : new Error(String(thrown))
        const stack = (error.stack || "").split("\n").slice(1).join("\n")
        if (error.message) {
            process.stderr.write(colors.red(`${colors.bold(error.name)}: ${error.message}\n`))
        }
        else {
            process.stderr.write(colors.red(`${colors.bold(error.name)}\n`))
        }
        if (stack) {
            process.stderr.write(`${colors.dim(stack)}\n`)
        }
    }
}

type Encode = (result: Result<unknown, unknown>) => string | Uint8Array

async function call(action: (options: never) => Promise<Result<unknown, unknown>>, resolved: ResolvedCommand, encode: Encode): Promise<string | Uint8Array> {
    const options = await resolveOptions({ argv: resolved.argv, command: resolved.command })
    if (options.error) return encode(Err(options.error))
    try {
        return encode(await action(options.options as never))
    }
    catch (thrown) {
        const error = thrown instanceof Error ? thrown : new Error(String(thrown))
        return encode(Err({ message: error.message, stack: error.stack, type: "CLIUnhandledExceptionError" }))
    }
}

function text(value: unknown): string {
    if (typeof value === "string") return value
    return Bun.inspect(value, { colors: false })
}
