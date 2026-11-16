import type { BooleanOption } from "../boolean"
import type { EnumOption } from "../enum"
import type { StringOption } from "../string"
import type { AnyOption, CLIInvalidOptionError, CLIMissingOptionError, Flag, InferOption } from "../types"
import { Parse } from "../../internals/Parse"
import { prompt } from "../prompt"

type OptionError = CLIInvalidOptionError | CLIMissingOptionError

/**
 * # option
 *
 * The value of `option` from `flags`. With `prompt`, a person is asked when it is missing or
 * invalid.
 *
 * ## Example
 *
 * ```ts
 * const { flags } = CLI.resolve.argv(["--seats", "3"])
 * await CLI.resolve.option("seats", seats, flags) // Ok(3)
 * ```
 */
export async function option<O extends AnyOption>(name: string, option: O, flags: Record<string, Flag>, input: { prompt?: boolean } = {}): Promise<Result<InferOption<O>, OptionError>> {
    const resolved = await fromFlags(name, option, flags)
    if (resolved.ok || !input.prompt) return resolved as Result<InferOption<O>, OptionError>
    return Ok(await prompt.option(name, option))
}

function fromFlags(name: string, option: AnyOption, flags: Record<string, Flag>): Promise<Result<unknown, OptionError>> | Result<unknown, OptionError> {
    if (option.kind === "boolean") return fromBoolean(name, option, flags)
    if (option.kind === "enum") return fromEnum(name, option, flags)
    return fromString(name, option, flags)
}

function fromBoolean(name: string, option: BooleanOption, flags: Record<string, Flag>): Result<boolean, OptionError> {
    const flag = flags[`--${String.kebabCase(name)}`]
    if (flag === undefined) return Ok(option.config.default)
    if (flag === null || flag === "true" || flag === "yes") return Ok(true)
    if (flag === "false" || flag === "no") return Ok(false)
    return Err<CLIInvalidOptionError>({ message: "Must be true or false", meta: { option: name }, name: "CLIInvalidOptionError" })
}

function fromEnum(name: string, option: EnumOption<string, boolean>, flags: Record<string, Flag>): Result<string, OptionError> {
    const flag = flags[`--${String.kebabCase(name)}`]
    const keys = Object.keys(option.config.options)
    if (flag === null) return Err<CLIInvalidOptionError>({ message: "Needs a value", meta: { option: name }, name: "CLIInvalidOptionError" })
    const value = flag ?? option.config.default
    if (value === undefined) return Err<CLIMissingOptionError>({ message: "Required", meta: { option: name }, name: "CLIMissingOptionError" })
    if (keys.includes(value)) return Ok(value)
    return Err<CLIInvalidOptionError>({ message: `Must be one of: ${keys.join(", ")}`, meta: { option: name }, name: "CLIInvalidOptionError" })
}

async function fromString(name: string, option: StringOption<unknown, boolean, boolean>, flags: Record<string, Flag>): Promise<Result<unknown, OptionError>> {
    const flag = flags[`--${String.kebabCase(name)}`]
    if (flag === null) return Err<CLIInvalidOptionError>({ message: "Needs a value", meta: { option: name }, name: "CLIInvalidOptionError" })
    const value = flag ?? option.config.default
    if (value === undefined && option.config.optional) return Ok(undefined)
    if (value === undefined) return Err<CLIMissingOptionError>({ message: "Required", meta: { option: name }, name: "CLIMissingOptionError" })
    const parsed = await Parse.value(option.config.parse, value)
    if (parsed.ok) return Ok(parsed.value)
    return Err<CLIInvalidOptionError>({ message: parsed.value.join("\n"), meta: { option: name }, name: "CLIInvalidOptionError" })
}
