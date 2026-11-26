import type { Result } from "@monstermann/stdlib"
import type { CLI } from "."
import { Err, Ok, String } from "@monstermann/stdlib"
import { Parse } from "../internals/Parse"
import { promptOption } from "./promptOption"

type OptionError = CLI.InvalidOptionError | CLI.MissingOptionError

/**
 * # resolveOption
 *
 * Reads the value of `option` from `flags`. With `prompt`, asks a person when the value is missing
 * or invalid.
 *
 * ## Example
 *
 * ```ts
 * const { flags } = CLI.resolveArgv(["--seats", "3"])
 * await CLI.resolveOption("seats", seats, flags) // Ok(3)
 * ```
 */
export async function resolveOption<O extends CLI.AnyOption>(name: string, option: O, flags: Record<string, CLI.ResolvedFlag[]>, input: { prompt?: boolean } = {}): Promise<Result<CLI.InferOption<O>, OptionError>> {
    const resolved = await fromFlags(name, option, flags)
    if (resolved.ok || !input.prompt) return resolved as Result<CLI.InferOption<O>, OptionError>
    return Ok(await promptOption(name, option))
}

function fromFlags(name: string, option: CLI.AnyOption, flags: Record<string, CLI.ResolvedFlag[]>): Promise<Result<unknown, OptionError>> | Result<unknown, OptionError> {
    const given = flags[`--${String.kebabCase(name)}`] ?? []
    if (given.length > 1) return Err<CLI.InvalidOptionError>({ message: "Options can only be used once", name: "CLIInvalidOptionError", option: name })
    const flag = given[0]?.value
    if (option.kind === "boolean") return fromBoolean(name, option, flag)
    if (option.kind === "enum") return fromEnum(name, option, flag)
    return fromString(name, option, flag)
}

function fromBoolean(name: string, option: CLI.BooleanOption, flag: CLI.Flag | undefined): Result<boolean, OptionError> {
    if (flag === undefined) return Ok(option.config.default)
    if (flag === null || flag === "true" || flag === "yes") return Ok(true)
    if (flag === "false" || flag === "no") return Ok(false)
    return Err<CLI.InvalidOptionError>({ message: "Must be true or false", name: "CLIInvalidOptionError", option: name })
}

function fromEnum(name: string, option: CLI.EnumOption<string, boolean>, flag: CLI.Flag | undefined): Result<string, OptionError> {
    const keys = Object.keys(option.config.options)
    if (flag === null) return Err<CLI.InvalidOptionError>({ message: "Needs a value", name: "CLIInvalidOptionError", option: name })
    const value = flag ?? option.config.default
    if (value === undefined) return Err<CLI.MissingOptionError>({ message: "Required", name: "CLIMissingOptionError", option: name })
    if (keys.includes(value)) return Ok(value)
    return Err<CLI.InvalidOptionError>({ message: `Must be one of: ${keys.join(", ")}`, name: "CLIInvalidOptionError", option: name })
}

async function fromString(name: string, option: CLI.StringOption<unknown, boolean, boolean>, flag: CLI.Flag | undefined): Promise<Result<unknown, OptionError>> {
    if (flag === null) return Err<CLI.InvalidOptionError>({ message: "Needs a value", name: "CLIInvalidOptionError", option: name })
    const value = flag ?? option.config.default
    if (value === undefined && option.config.optional) return Ok(undefined)
    if (value === undefined) return Err<CLI.MissingOptionError>({ message: "Required", name: "CLIMissingOptionError", option: name })
    const parsed = await Parse.value(option.config.parse, value)
    if (parsed.ok) return Ok(parsed.value)
    return Err<CLI.InvalidOptionError>({ message: parsed.value.join("\n"), name: "CLIInvalidOptionError", option: name })
}
