import type { CLI } from "."
import { String } from "@monstermann/stdlib"
import { Layout } from "../internals/Layout"
import { quote } from "../internals/quote"
import { cyan } from "./cyan"
import { dim } from "./dim"

/**
 * # optionHelp
 *
 * Returns the help line of one option. The flag is padded to `width`.
 *
 * ## Example
 *
 * ```ts
 * CLI.optionHelp("seats", CLI.string().desc("How many seats they get").default("1"), 7)
 * // "  --seats  How many seats they get (default: 1)"
 * ```
 */
export function optionHelp(name: string, option: CLI.AnyOption, width: number): string {
    const flag = cyan(`--${String.kebabCase(name)}`)
    const notes = notesOf(option)
    const note = notes.length ? dim(`(${notes.join(", ")})`) : ""
    return Layout.row(flag, `${option.config.desc ?? ""} ${note}`.trim(), width)
}

function notesOf(option: CLI.AnyOption): string[] {
    if (option.kind === "boolean") return option.config.default ? ["default: true"] : []
    if (option.kind === "enum") {
        return [
            ...option.config.default === undefined ? [] : [`default: ${option.config.default}`],
            `options: ${Object.keys(option.config.options).join(", ")}`,
        ]
    }
    const notes = []
    if (option.config.example) notes.push(`example: ${quote(option.config.example)}`)
    if (option.config.default !== undefined && !option.config.sensitive) notes.push(`default: ${option.config.default}`)
    if (option.config.default !== undefined && option.config.sensitive) notes.push("optional")
    if (option.config.default === undefined && option.config.optional) notes.push("optional")
    return notes
}
