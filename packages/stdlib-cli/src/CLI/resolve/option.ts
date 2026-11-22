import type { Result } from "@monstermann/stdlib"
import type { BooleanOption } from "../boolean"
import type { EnumOption } from "../enum"
import type { StringOption } from "../string"
import type { AnyOption, CLIInvalidOptionError, CLIMissingOptionError, Flag, InferOption } from "../types"
import type { ResolvedFlag } from "./argv"
import { Err, Ok, String } from "@monstermann/stdlib"
import { Parse } from "../../internals/Parse"
import { prompt } from "../prompt"

type OptionError = CLIInvalidOptionError | CLIMissingOptionError

/**
 * # option
 *
 * Reads the value of `option` from `flags`. With `prompt`, asks a person when the value is missing
 * or invalid.
 *
 * ## Example
 *
 * ```ts
 * const { flags } = CLI.resolve.argv(["--seats", "3"])
 * await CLI.resolve.option("seats", seats, flags) // Ok(3)
 * ```
 */
export async function option<O extends AnyOption>(name: string, option: O, flags: Record<string, ResolvedFlag[]>, input: { prompt?: boolean } = {}): Promise<Result<InferOption<O>, OptionError>> {
    const resolved = await fromFlags(name, option, flags)
    if (resolved.ok || !input.prompt) return resolved as Result<InferOption<O>, OptionError>
    return Ok(await prompt.option(name, option))
}

function fromFlags(name: string, option: AnyOption, flags: Record<string, ResolvedFlag[]>): Promise<Result<unknown, OptionError>> | Result<unknown, OptionError> {
    const given = flags[`--${String.kebabCase(name)}`] ?? []
    if (given.length > 1) return Err<CLIInvalidOptionError>({ message: "Options can only be used once", meta: { option: name }, name: "CLIInvalidOptionError" })
    const flag = given[0]?.value
    if (option.kind === "boolean") return fromBoolean(name, option, flag)
    if (option.kind === "enum") return fromEnum(name, option, flag)
    return fromString(name, option, flag)
}

function fromBoolean(name: string, option: BooleanOption, flag: Flag | undefined): Result<boolean, OptionError> {
    if (flag === undefined) return Ok(option.config.default)
    if (flag === null || flag === "true" || flag === "yes") return Ok(true)
    if (flag === "false" || flag === "no") return Ok(false)
    return Err<CLIInvalidOptionError>({ message: "Must be true or false", meta: { option: name }, name: "CLIInvalidOptionError" })
}

function fromEnum(name: string, option: EnumOption<string, boolean>, flag: Flag | undefined): Result<string, OptionError> {
    const keys = Object.keys(option.config.options)
    if (flag === null) return Err<CLIInvalidOptionError>({ message: "Needs a value", meta: { option: name }, name: "CLIInvalidOptionError" })
    const value = flag ?? option.config.default
    if (value === undefined) return Err<CLIMissingOptionError>({ message: "Required", meta: { option: name }, name: "CLIMissingOptionError" })
    if (keys.includes(value)) return Ok(value)
    return Err<CLIInvalidOptionError>({ message: `Must be one of: ${keys.join(", ")}`, meta: { option: name }, name: "CLIInvalidOptionError" })
}

async function fromString(name: string, option: StringOption<unknown, boolean, boolean>, flag: Flag | undefined): Promise<Result<unknown, OptionError>> {
    if (flag === null) return Err<CLIInvalidOptionError>({ message: "Needs a value", meta: { option: name }, name: "CLIInvalidOptionError" })
    const value = flag ?? option.config.default
    if (value === undefined && option.config.optional) return Ok(undefined)
    if (value === undefined) return Err<CLIMissingOptionError>({ message: "Required", meta: { option: name }, name: "CLIMissingOptionError" })
    const parsed = await Parse.value(option.config.parse, value)
    if (parsed.ok) return Ok(parsed.value)
    return Err<CLIInvalidOptionError>({ message: parsed.value.join("\n"), meta: { option: name }, name: "CLIInvalidOptionError" })
}
