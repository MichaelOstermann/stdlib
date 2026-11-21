import type { AnyOption, CommandOptions } from "../types"
import { String } from "@monstermann/stdlib"
import { Layout } from "../../internals/Layout"
import { option } from "./option"

/**
 * # options
 *
 * The `Options:` section of the help, the required ones first.
 *
 * ## Example
 *
 * ```ts
 * CLI.help.options(add.config.options)
 * // Options:
 * //   --email       Their email address
 * //   --first-name  Their first name (optional)
 * ```
 */
export function options(options: CommandOptions): string {
    const entries = Object.entries(options)
    const required = entries.filter(([, definition]) => !isOptional(definition))
    const optional = entries.filter(([, definition]) => isOptional(definition))
    const width = Math.max(0, ...entries.map(([name]) => Bun.stringWidth(`--${String.kebabCase(name)}`)))
    return Layout.section("Options", [...required, ...optional].map(([name, definition]) => option(name, definition, width)))
}

function isOptional(definition: AnyOption): boolean {
    if (definition.kind === "boolean") return true
    if (definition.config.default !== undefined) return true
    return definition.kind === "string" && definition.config.optional
}
