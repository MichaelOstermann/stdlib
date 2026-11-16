import type { BooleanOption } from "../boolean"
import type { EnumOption } from "../enum"
import type { StringOption } from "../string"
import type { AnyOption, InferOption } from "../types"
import { Parse } from "../../internals/Parse"
import { ansi } from "../ansi"
import { confirm } from "./confirm"
import { select } from "./select"
import { text } from "./text"

/**
 * # option
 *
 * Asks for the value of `option`, starting at its default.
 *
 * ## Example
 *
 * ```ts
 * const email = await CLI.prompt.option("email", CLI.string().desc("Their email address"))
 * ```
 */
export function option<O extends AnyOption>(name: string, option: O): Promise<InferOption<O>> {
    const any: AnyOption = option
    if (any.kind === "boolean") return promptBoolean(name, any) as never
    if (any.kind === "enum") return promptEnum(name, any) as never
    return promptString(name, any) as never
}

function promptBoolean(name: string, option: BooleanOption): Promise<boolean> {
    const label = String.sentenceCase(name)
    const desc = option.config.desc ? ansi.dim(option.config.desc) : ""
    return confirm({
        initial: option.config.default,
        prefix: (_, done) => done ? `${ansi.blue(label)}: ` : `${[`${ansi.magenta(label)}:`, desc].filter(Boolean).join(" ")} `,
    })
}

function promptEnum(name: string, option: EnumOption<string, boolean>): Promise<string> {
    const label = String.sentenceCase(name)
    const desc = option.config.desc ? ansi.dim(option.config.desc) : ""
    const keys = Object.keys(option.config.options)
    const width = Math.max(0, ...keys.map((key) => Bun.stringWidth(key)))
    return select({
        choices: keys,
        initial: option.config.default,
        choice: (key, active) => `${active ? ansi.cyan("❯") : " "} ${key.padEnd(width, " ")}  ${ansi.dim(option.config.options[key]!)}`,
        header: (active, done) => done ? `${ansi.blue(label)}: ${active}` : [`${ansi.magenta(label)}:`, desc].filter(Boolean).join(" "),
    })
}

function promptString(name: string, option: StringOption<unknown, boolean, boolean>): Promise<unknown> {
    const label = String.sentenceCase(name)
    const { config } = option
    return text({
        initial: config.default,
        mask: config.sensitive ? "*" : undefined,
        placeholder: [config.desc, config.example ? `(Example: ${config.example})` : ""].filter(Boolean).join(" "),
        footer: (text, done) => done ? undefined : text.$error() && ansi.red(text.$error()!),
        prefix: (_, done) => done ? `${ansi.blue(label)}: ` : `${ansi.magenta(label)}: `,
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
