import type { Result } from "@monstermann/stdlib"
import type { CLI } from "."
import { Err, Ok, String } from "@monstermann/stdlib"
import { Parse } from "../internals/Parse"
import { blue } from "./blue"
import { confirm } from "./confirm"
import { cyan } from "./cyan"
import { dim } from "./dim"
import { magenta } from "./magenta"
import { prompt } from "./prompt"
import { red } from "./red"
import { select } from "./select"

/**
 * # promptOption
 *
 * Asks for the value of `option`. The prompt starts with the default of `option`.
 *
 * ## Example
 *
 * ```ts
 * const email = await CLI.promptOption("email", CLI.string().desc("Their email address"))
 * ```
 */
export function promptOption<O extends CLI.AnyOption>(name: string, option: O): Promise<CLI.InferOption<O>> {
    const any: CLI.AnyOption = option
    if (any.kind === "boolean") return promptBoolean(name, any) as never
    if (any.kind === "enum") return promptEnum(name, any) as never
    return promptString(name, any) as never
}

function promptBoolean(name: string, option: CLI.BooleanOption): Promise<boolean> {
    const label = String.sentenceCase(name)
    const desc = option.config.desc ? dim(option.config.desc) : ""
    return confirm({
        initial: option.config.default,
        prefix: (_, done) => done ? `${blue(label)}: ` : `${[`${magenta(label)}:`, desc].filter(Boolean).join(" ")} `,
    })
}

function promptEnum(name: string, option: CLI.EnumOption<string, boolean>): Promise<string> {
    const label = String.sentenceCase(name)
    const desc = option.config.desc ? dim(option.config.desc) : ""
    const keys = Object.keys(option.config.options)
    const width = Math.max(0, ...keys.map((key) => Bun.stringWidth(key)))
    return select({
        choices: keys,
        initial: option.config.default,
        choice: (key, active) => `${active ? cyan("❯") : " "} ${key.padEnd(width, " ")}  ${dim(option.config.options[key]!)}`,
        header: (active, done) => done ? `${blue(label)}: ${active}` : [`${magenta(label)}:`, desc].filter(Boolean).join(" "),
    })
}

function promptString(name: string, option: CLI.StringOption<unknown, boolean, boolean>): Promise<unknown> {
    const label = String.sentenceCase(name)
    const { config } = option
    return prompt({
        initial: config.default,
        mask: config.sensitive ? "*" : undefined,
        placeholder: [config.desc, config.example ? `(Example: ${config.example})` : ""].filter(Boolean).join(" "),
        footer: (text, done) => done ? undefined : text.$error() && red(text.$error()!),
        prefix: (_, done) => done ? `${blue(label)}: ` : `${magenta(label)}: `,
        parse: async (value: string): Promise<Result<unknown, string>> => {
            const typed = value === "" ? config.default : value
            if (typed === undefined && config.optional) return Ok(undefined)
            if (typed === undefined) return Err("Required")
            const parsed = await Parse.value(config.parse, typed)
            if (parsed.ok) return Ok(parsed.value)
            return Err(parsed.value.join("\n"))
        },
    })
}
