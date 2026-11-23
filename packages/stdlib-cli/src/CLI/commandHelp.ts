import type { CLI } from "."
import { String } from "@monstermann/stdlib"
import { Layout } from "../internals/Layout"
import { quote } from "../internals/quote"
import { blue } from "./blue"
import { cyan } from "./cyan"
import { optionsHelp } from "./optionsHelp"

/**
 * # commandHelp
 *
 * Returns the help text of `command`. The `globalOptions` come after the options of `command`.
 *
 * `path` holds the words that run `command`. With `path`, the help shows an example command line.
 * The example needs an example value for every required option.
 *
 * ## Example
 *
 * ```ts
 * CLI.commandHelp(add, { globalOptions: { help: CLI.boolean().desc("Show this help") }, path: ["miko", "members", "add"] })
 * ```
 */
export function commandHelp(command: CLI.AnyCommand, input: { globalOptions?: CLI.CommandOptions, path?: string[] } = {}): string {
    const desc = (command.config.desc ?? "").split("\n").filter(Boolean)
    const commands = Object.entries(command.config.commands)
    const width = Math.max(0, ...commands.map(([name]) => Bun.stringWidth(name)))
    const example = input.path && command.config.action ? exampleOf(command.config.options, input.path) : undefined
    return Layout.paragraphs([
        Layout.section("Description", desc.map((line) => `  ${line}`)),
        Layout.section("Example", example ? [`  ${example}`] : []),
        Layout.section("Commands", commands.map(([name, child]) => Layout.row(blue(name), (child.config.desc ?? "").split("\n")[0]!, width))),
        optionsHelp({ ...command.config.options, ...input.globalOptions }),
    ])
}

/** Returns a command line with every required option filled in. Needs an example for each one. */
function exampleOf(options: CLI.CommandOptions, path: string[]): string | undefined {
    const required = Object.entries(options).filter(([, option]) => isRequired(option))
    const values = required.map(([, option]) => exampleValue(option))
    if (!required.length || values.includes(undefined)) return undefined
    const flags = required.map(([name], index) => `${cyan(`--${String.kebabCase(name)}`)} ${quote(values[index]!)}`)
    return [blue(path.join(" ")), ...flags].join(" ")
}

function exampleValue(option: CLI.AnyOption): string | undefined {
    if (option.kind === "enum") return Object.keys(option.config.options)[0]
    if (option.kind === "string" && !option.config.sensitive) return option.config.example
    return undefined
}

function isRequired(option: CLI.AnyOption): boolean {
    if (option.kind === "boolean") return false
    if (option.config.default !== undefined) return false
    return option.kind === "enum" || !option.config.optional
}
