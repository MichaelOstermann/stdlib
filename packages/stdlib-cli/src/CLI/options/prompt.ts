import type { CommandOption } from "../types"
import { colors } from "../../internals/colors"
import { Parse } from "../../internals/Parse"
import { confirm } from "../terminal/confirm"
import { prompt as promptText } from "../terminal/prompt"
import { select } from "../terminal/select"

/**
 * Asks for the value of the option `name` in the terminal, starting at `initial`, what was typed
 * for it, or else its default. Strings are checked like `CLI.options.resolve` does, enums are
 * picked from their options, booleans are answered with yes or no, both saying so when `initial` is
 * not one of them.
 */
export function prompt(name: string, option: CommandOption, initial: string | undefined): Promise<unknown> {
    const label = String.sentenceCase(name)
    const desc = option.config.desc ? colors.dim(option.config.desc) : ""

    if (option.kind === "boolean") {
        const invalid = initial !== undefined && initial !== "true" && initial !== "false"
        return confirm({
            initial: booleanInitial(initial, option.config.default),
            footer: (_, done) => done || !invalid ? undefined : colors.red(notAnOption(initial)),
            prefix: (_, done) => done ? `${colors.blue(label)}: ` : `${parts([`${colors.magenta(label)}:`, desc])} `,
        })
    }

    if (option.kind === "enum") {
        const choices = option.config.options
        const keys = Object.keys(choices)
        const invalid = initial !== undefined && !keys.includes(initial)
        const width = keys.reduce((acc, key) => Math.max(acc, Bun.stringWidth(key)), 0)
        return select({
            choices: keys,
            initial: invalid || initial === undefined ? option.config.default : initial,
            choice: (key, active) => `${active ? colors.cyan("❯") : " "} ${key.padEnd(width, " ")}  ${colors.dim(choices[key]!)}`,
            footer: (_, done) => done || !invalid ? undefined : colors.red(notAnOption(initial)),
            header: (active, done) => done ? `${colors.blue(label)}: ${active}` : parts([`${colors.magenta(label)}:`, desc]),
        })
    }

    const config = option.config
    return promptText({
        initial: initial ?? config.default,
        placeholder: parts([option.config.desc, config.example ? `(Example: ${config.example})` : ""]),
        footer: (text, done) => done ? undefined : text.$error() && colors.red(text.$error()!),
        prefix: (_, done) => done ? `${colors.blue(label)}: ` : `${colors.magenta(label)}: `,
        parse: async (value: string): Promise<Result<unknown, string>> => {
            if (value === "" && config.optional) return Ok(undefined)
            if (value === "") return Err("Required")
            const parsed = await Parse.value(config.parse, value)
            if (parsed.ok) return Ok(parsed.value)
            return Err(parsed.value.join("\n"))
        },
    })
}

function notAnOption(value: string | undefined): string {
    return `"${value}" is not a valid option, please choose one above`
}

function booleanInitial(initial: string | undefined, fallback: boolean): boolean {
    if (initial === "true") return true
    if (initial === "false") return false
    return fallback
}

function parts(strings: (string | undefined)[]): string {
    return strings.filter(Boolean).join(" ")
}
