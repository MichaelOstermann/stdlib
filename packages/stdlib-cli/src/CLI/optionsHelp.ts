import type { CLI } from "."
import { String } from "@monstermann/stdlib"
import { Layout } from "../internals/Layout"
import { optionHelp } from "./optionHelp"

/**
 * # optionsHelp
 *
 * Returns the `Options:` section of the help. Required options come first.
 *
 * ## Example
 *
 * ```ts
 * CLI.optionsHelp(add.config.options)
 * // Options:
 * //   --email       Their email address
 * //   --first-name  Their first name (optional)
 * ```
 */
export function optionsHelp(options: CLI.CommandOptions): string {
    const entries = Object.entries(options)
    const required = entries.filter(([, definition]) => !isOptional(definition))
    const optional = entries.filter(([, definition]) => isOptional(definition))
    const width = Math.max(0, ...entries.map(([name]) => Bun.stringWidth(`--${String.kebabCase(name)}`)))
    return Layout.section("Options", [...required, ...optional].map(([name, definition]) => optionHelp(name, definition, width)))
}

function isOptional(definition: CLI.AnyOption): boolean {
    if (definition.kind === "boolean") return true
    if (definition.config.default !== undefined) return true
    return definition.kind === "string" && definition.config.optional
}
