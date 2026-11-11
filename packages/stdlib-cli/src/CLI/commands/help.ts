import type { AnyCommand, CommandOptions } from "../types"
import { colors } from "../../internals/colors"
import { Layout } from "../../internals/Layout"
import { help as optionsHelp } from "../options/help"

/**
 * # help
 *
 * ```ts
 * function CLI.commands.help(input: { command: AnyCommand, path: string[], globalOptions?: CommandOptions }): string
 * ```
 *
 * The help of `command`: its `path` from the program name on, its description, its subcommands and
 * its options, followed by `globalOptions` that every command understands, like `--help`.
 *
 * ## Example
 *
 * ```ts
 * CLI.commands.help({ command: add, path: ["miko", "members", "add"] })
 * ```
 */
export function help(input: { command: AnyCommand, globalOptions?: CommandOptions, path: string[] }): string {
    const commands = input.command.config.commands
    return Layout.paragraphs([
        Layout.section("Command", [[input.path.join(" "), ""]]),
        Layout.section("Description", lines(input.command.config.desc).map((line) => [line, ""])),
        Layout.section("Commands", Object.entries(commands).map(([name, command]) => [colors.blue(name), firstLine(command.config.desc)])),
        optionsHelp({ ...input.command.config.options, ...input.globalOptions }),
    ])
}

function lines(text: string | undefined): string[] {
    if (!text) return []
    return text.split("\n")
}

function firstLine(text: string | undefined): string {
    return (text ?? "").split("\n")[0]!
}
