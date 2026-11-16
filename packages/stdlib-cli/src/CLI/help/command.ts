import type { AnyCommand, CommandOptions } from "../types"
import { Layout } from "../../internals/Layout"
import { ansi } from "../ansi"
import { options } from "./options"

/**
 * # command
 *
 * The help of `command`, with `options` after its own.
 *
 * ## Example
 *
 * ```ts
 * CLI.help.command(add, { help: CLI.boolean().desc("Show this help") })
 * ```
 */
export function command(command: AnyCommand, globalOptions: CommandOptions = {}): string {
    const desc = (command.config.desc ?? "").split("\n").filter(Boolean)
    const commands = Object.entries(command.config.commands)
    const width = Math.max(0, ...commands.map(([name]) => Bun.stringWidth(name)))
    return Layout.paragraphs([
        Layout.section("Description", desc.map((line) => `  ${line}`)),
        Layout.section("Commands", commands.map(([name, child]) => Layout.row(ansi.blue(name), (child.config.desc ?? "").split("\n")[0]!, width))),
        options({ ...command.config.options, ...globalOptions }),
    ])
}
