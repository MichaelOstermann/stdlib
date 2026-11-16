import type { Execution } from "../exec"
import type { CLIError, CLIOptionError, CLIOptionsError } from "../types"
import { suggest } from "../../internals/suggest"
import { ansi } from "../ansi"
import { boolean } from "../boolean"
import { commands } from "../commands"
import { help } from "../help"
import { error } from "./error"
import { json } from "./json"

/**
 * # exec
 *
 * The text `CLI.run` prints for what `CLI.exec` returned.
 *
 * ## Example
 *
 * ```ts
 * const execution = await CLI.exec(miko, { argv: CLI.resolve.argv() })
 * process.stdout.write(`${CLI.format.exec(execution)}\n`)
 * ```
 */
export function exec(execution: Execution): string {
    const { command, isHelp, isRPC, result } = execution
    if (isRPC) return JSON.stringify({ ok: result.ok, value: result.value })
    if (!result.ok) return failureText(execution, result.value)
    if (isHelp && command) return help.command(command.command, { help: boolean().desc("Show this help") })
    if (result.value === null) return ""
    return json(result.value)
}

function failureText(execution: Execution, failure: CLIError | Failure): string {
    if (failure.name === "CLIUnknownCommandError") return ansi.red(unknownCommand(execution))
    if (failure.name === "CLIOptionsError") return (failure as CLIOptionsError).errors.map((item) => ansi.red(optionError(execution, item))).join("\n")
    return error(failure)
}

function unknownCommand({ argv, program }: Execution): string {
    const found = commands.nearest(program, argv.path)
    const typed = argv.path[found.path.length]!
    const suggestions = suggest(typed, Object.keys(found.command.config.commands))
    if (!suggestions.length) return `Unknown command ${typed}`
    return `Unknown command ${typed}, did you mean: ${suggestions.join(", ")}?`
}

function optionError({ command }: Execution, error: CLIOptionError): string {
    const typed = error.meta.option
    if (error.name !== "CLIUnknownOptionError") return `Invalid option --${String.kebabCase(typed)}: ${error.message}`
    const known = Object.keys(command?.command.config.options ?? {}).map((name) => String.kebabCase(name))
    const suggestions = typed.startsWith("--") ? suggest(typed.slice(2), known).map((flag) => `--${flag}`) : []
    if (!suggestions.length) return `Unknown option ${typed}`
    return `Unknown option ${typed}, did you mean: ${suggestions.join(", ")}?`
}
