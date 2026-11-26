import type { Result } from "@monstermann/stdlib"
import type { CLI } from "."
import { Err, Ok, String } from "@monstermann/stdlib"
import { promptOption } from "./promptOption"
import { resolveOption } from "./resolveOption"

/**
 * # resolveOptions
 *
 * Reads the values of `options` from `flags`. On failure, returns every problem at once. With
 * `prompt`, asks a person for missing or invalid values.
 *
 * ## Example
 *
 * ```ts
 * const { flags } = CLI.resolveArgv(["--email", "a@b.c"])
 * await CLI.resolveOptions(add.config.options, flags) // Ok({ email: "a@b.c" })
 * ```
 */
export async function resolveOptions<O extends CLI.CommandOptions>(options: O, flags: Record<string, CLI.ResolvedFlag[]>, input: { prompt?: boolean } = {}): Promise<Result<CLI.InferOptions<O>, CLI.OptionsError>> {
    const known = Object.keys(options).map((name) => `--${String.kebabCase(name)}`)
    const unknown = Object.keys(flags).filter((flag) => !known.includes(flag))
    const isPrompting = input.prompt === true && !unknown.length
    const isAskingAll = isPrompting && !Object.keys(flags).length

    const values: Record<string, unknown> = {}
    const errors: CLI.OptionError[] = []
    for (const [name, definition] of Object.entries(options)) {
        const value = isAskingAll ? Ok(await promptOption(name, definition)) : await resolveOption(name, definition, flags, { prompt: isPrompting })
        if (value.ok) values[name] = value.value
        if (!value.ok) errors.push(value.value)
    }
    errors.push(...unknown.map((flag): CLI.UnknownOptionError => ({ message: "Unknown option", name: "CLIUnknownOptionError", option: flag })))

    if (errors.length) return Err<CLI.OptionsError>({ errors, message: "Invalid options", name: "CLIOptionsError" })
    return Ok(values as CLI.InferOptions<O>)
}
