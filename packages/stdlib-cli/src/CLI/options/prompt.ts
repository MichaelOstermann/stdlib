import type { AnyCommand, CommandOption, InferOptions } from "../types"
import { colors } from "../../internals/colors"
import { Parse } from "../../internals/Parse"
import { confirm } from "../terminal/confirm"
import { prompt as promptText } from "../terminal/prompt"
import { select } from "../terminal/select"

/**
 * # prompt
 *
 * ```ts
 * function CLI.options.prompt<C extends AnyCommand>(command: C): Promise<InferOptions<C>>
 * ```
 *
 * Asks for every option of `command` in the terminal, one after the other, and returns their
 * values. Strings are typed and checked as they are typed, enums are picked from their choices,
 * booleans are answered with yes or no. Defaults are filled in, examples are shown while empty.
 *
 * ## Example
 *
 * ```ts
 * const options = await CLI.options.prompt(add)
 * await add.config.action(options)
 * ```
 */
export async function prompt<C extends AnyCommand>(command: C): Promise<InferOptions<C>> {
    const values: Record<string, unknown> = {}
    for (const [name, option] of Object.entries(command.config.options)) {
        values[name] = await ask(name, option)
    }
    return values as InferOptions<C>
}

function ask(name: string, option: CommandOption): Promise<unknown> {
    const label = labelOf(name)
    const desc = option.config.desc ? colors.dim(option.config.desc) : ""

    if (option.kind === "boolean") {
        return confirm({
            initial: option.config.default,
            prefix: (_, done) => done ? `${colors.blue(label)}: ` : `${parts([`${colors.magenta(label)}:`, desc])} `,
        })
    }

    if (option.kind === "enum") {
        const choices = option.config.options
        const keys = Object.keys(choices)
        const width = keys.reduce((acc, key) => Math.max(acc, Bun.stringWidth(key)), 0)
        return select({
            choices: keys,
            initial: option.config.default,
            choice: (key, active) => `${active ? colors.cyan("❯") : " "} ${key.padEnd(width, " ")}  ${colors.dim(choices[key]!)}`,
            header: (active, done) => done ? `${colors.blue(label)}: ${active}` : parts([`${colors.magenta(label)}:`, desc]),
        })
    }

    const config = option.config
    return promptText({
        initial: config.default,
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

function parts(strings: (string | undefined)[]): string {
    return strings.filter(Boolean).join(" ")
}

function labelOf(name: string): string {
    const words = String.kebabCase(name).replaceAll("-", " ")
    return words.charAt(0).toUpperCase() + words.slice(1)
}
