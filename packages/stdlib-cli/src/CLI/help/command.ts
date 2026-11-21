import type { AnyCommand, AnyOption, CommandOptions } from "../types"
import { String } from "@monstermann/stdlib"
import { Layout } from "../../internals/Layout"
import { quote } from "../../internals/quote"
import { ansi } from "../ansi"
import { options } from "./options"

/**
 * # command
 *
 * The help of `command`, with `globalOptions` after its own. With `path`, the words that run it, an
 * example shows how, when every required option has an example.
 *
 * ## Example
 *
 * ```ts
 * CLI.help.command(add, { globalOptions: { help: CLI.boolean().desc("Show this help") }, path: ["miko", "members", "add"] })
 * ```
 */
export function command(command: AnyCommand, input: { globalOptions?: CommandOptions, path?: string[] } = {}): string {
    const desc = (command.config.desc ?? "").split("\n").filter(Boolean)
    const commands = Object.entries(command.config.commands)
    const width = Math.max(0, ...commands.map(([name]) => Bun.stringWidth(name)))
    const example = input.path && command.config.action ? exampleOf(command.config.options, input.path) : undefined
    return Layout.paragraphs([
        Layout.section("Description", desc.map((line) => `  ${line}`)),
        Layout.section("Example", example ? [`  ${example}`] : []),
        Layout.section("Commands", commands.map(([name, child]) => Layout.row(ansi.blue(name), (child.config.desc ?? "").split("\n")[0]!, width))),
        options({ ...command.config.options, ...input.globalOptions }),
    ])
}

/** The command line with every required option, when each of them has an example. */
function exampleOf(options: CommandOptions, path: string[]): string | undefined {
    const required = Object.entries(options).filter(([, option]) => isRequired(option))
    const values = required.map(([, option]) => exampleValue(option))
    if (!required.length || values.includes(undefined)) return undefined
    const flags = required.map(([name], index) => `${ansi.cyan(`--${String.kebabCase(name)}`)} ${quote(values[index]!)}`)
    return [ansi.blue(path.join(" ")), ...flags].join(" ")
}

function exampleValue(option: AnyOption): string | undefined {
    if (option.kind === "enum") return Object.keys(option.config.options)[0]
    if (option.kind === "string" && !option.config.sensitive) return option.config.example
    return undefined
}

function isRequired(option: AnyOption): boolean {
    if (option.kind === "boolean") return false
    if (option.config.default !== undefined) return false
    return option.kind === "enum" || !option.config.optional
}
