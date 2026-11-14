import type { CommandOption, CommandOptions } from "../types"
import { colors } from "../../internals/colors"
import { Layout } from "../../internals/Layout"

/**
 * # help
 *
 * ```ts
 * function CLI.options.help(options: CommandOptions): string
 * ```
 *
 * The options as a table under `Options:`, each flag with its description and what it falls back
 * to. Empty when there are no options.
 */
export function help(options: CommandOptions): string {
    const entries = Object.entries(options)
    const required = entries.filter(([_, option]) => {
        if (option.config.default !== undefined) return false
        if (option.kind === "string" && option.config.optional) return false
        return true
    })
    const optional = entries.filter(([_, option]) => {
        if (option.config.default !== undefined) return true
        if (option.kind === "string" && option.config.optional) return true
        return false
    })
    return Layout.section("Options", [
        ...required.map(([name, option]) => row(name, option)),
        ...optional.map(([name, option]) => row(name, option)),
    ])
}

function row(name: string, option: CommandOption): [string, string] {
    const flag = colors.cyan(`--${String.kebabCase(name)}`)
    const desc = option.config.desc ?? ""
    if (name === "help") return [flag, desc]
    const notes = []

    if ("example" in option.config && option.config.example) {
        notes.push(`example: ${example(option.config.example)}`)
    }

    const isSensitive = option.kind === "string" && option.config.sensitive

    if (option.config.default !== undefined && !isSensitive) {
        notes.push(`default: ${option.config.default}`)
    }
    else if (option.kind === "string" && (option.config.optional || option.config.default !== undefined)) {
        notes.push("optional")
    }

    if (option.kind === "enum") {
        notes.push(`options: ${Object.keys(option.config.options).join(", ")}`)
    }

    const note = notes.length ? colors.dim(`(${notes.join(", ").trim()})`) : ""
    return [flag, `${desc} ${note}`.trim()]
}

function example(value: string): string {
    if (/^[\w@%+=:,./-]+$/.test(value)) return value
    return `'${value.replaceAll("'", "'\\''")}'`
}
