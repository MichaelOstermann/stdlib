import type { CLIOptionError, CLIOptionsError, CLIUnknownOptionError, CommandOptions, Flag, InferOptions } from "../types"
import { prompt } from "../prompt"
import { option } from "./option"

/**
 * # options
 *
 * The values of `options` from `flags`, or every problem at once. With `prompt`, a person is asked
 * for what is missing or invalid.
 *
 * ## Example
 *
 * ```ts
 * const { flags } = CLI.resolve.argv(["--email", "a@b.c"])
 * await CLI.resolve.options(add.config.options, flags) // Ok({ email: "a@b.c" })
 * ```
 */
export async function options<O extends CommandOptions>(options: O, flags: Record<string, Flag>, input: { prompt?: boolean } = {}): Promise<Result<InferOptions<O>, CLIOptionsError>> {
    const known = Object.keys(options).map((name) => `--${String.kebabCase(name)}`)
    const unknown = Object.keys(flags).filter((flag) => !known.includes(flag))
    const isPrompting = input.prompt === true && !unknown.length
    const isAskingAll = isPrompting && !Object.keys(flags).length

    const values: Record<string, unknown> = {}
    const errors: CLIOptionError[] = []
    for (const [name, definition] of Object.entries(options)) {
        const value = isAskingAll ? Ok(await prompt.option(name, definition)) : await option(name, definition, flags, { prompt: isPrompting })
        if (value.ok) values[name] = value.value
        if (!value.ok) errors.push(value.value)
    }
    errors.push(...unknown.map((flag): CLIUnknownOptionError => ({ message: "Unknown option", meta: { option: flag }, name: "CLIUnknownOptionError" })))

    if (errors.length) return Err<CLIOptionsError>({ errors, message: "Invalid options", name: "CLIOptionsError" })
    return Ok(values as InferOptions<O>)
}
