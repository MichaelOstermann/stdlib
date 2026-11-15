import type { AnyCommand, CLIInvalidOptionError, CLIOptionError, CLIUnknownOptionError, CommandOption, InferOptions, ResolvedOptions } from "../types"
import { colors } from "../../internals/colors"
import { Layout } from "../../internals/Layout"
import { Parse } from "../../internals/Parse"
import { suggest } from "../../internals/suggest"
import { help } from "./help"
import { prompt } from "./prompt"

/** What argv said about one option: nothing, a flag without a value, or a value. */
type Given =
    | { type: "absent" }
    | { type: "empty" }
    | { type: "value", value: boolean | string }

/**
 * # resolve
 *
 * ```ts
 * function CLI.options.resolve<C extends AnyCommand>(input: { argv: string[], command: C, prompt?: boolean }): Promise<ResolvedOptions<C>>
 * ```
 *
 * Reads the options of `command` from `argv`: `--first-name John`, `--first-name=John`, an empty
 * `--first-name=`, and for booleans `--force`, `--no-force` and `--force=false`. The last one given
 * wins.
 *
 * When something is missing, invalid or unknown, returns `error` with every problem, and `message`
 * to show for them with the options they are about.
 *
 * With `prompt`, it asks in the terminal instead: for every option when `argv` is empty, otherwise
 * for the ones that are missing or invalid, starting at what was typed. Unknown words are still an
 * `error`, before anything is asked.
 *
 * ## Example
 *
 * ```ts
 * const resolved = await CLI.options.resolve({ argv: ["--email", "a@b.c"], command: add })
 * if (resolved.error) console.error(resolved.message)
 * else await add.config.action(resolved.options)
 * ```
 */
export async function resolve<C extends AnyCommand>(input: { argv: string[], command: C, prompt?: boolean }): Promise<ResolvedOptions<C>> {
    const options = input.command.config.options
    const names = Object.keys(options)
    const flags = names.map((name) => `--${String.kebabCase(name)}`)
    const given = new Map<string, Given>()
    const errors: CLIOptionError[] = []

    for (let index = 0; index < input.argv.length; index++) {
        const word = input.argv[index]!
        if (!word.startsWith("-")) {
            errors.push({ message: `Unknown option ${word}`, meta: { input: word, suggestions: [] }, name: "CLIUnknownOptionError" })
            continue
        }

        const [flag = word, inline] = splitOnce(word, "=")
        const name = names[flags.indexOf(flag)]
        const negated = names[flags.indexOf(flag.replace(/^--no-/, "--"))]

        if (name !== undefined && options[name]!.kind === "boolean") {
            given.set(name, inline === undefined ? { type: "value", value: true } : { type: "value", value: inline })
            continue
        }
        if (negated !== undefined && options[negated]!.kind === "boolean" && inline === undefined) {
            given.set(negated, { type: "value", value: false })
            continue
        }
        if (name === undefined) {
            errors.push(unknownOption(flag, flags))
            const next = input.argv[index + 1]
            if (inline === undefined && next !== undefined && !next.startsWith("--")) index++
            continue
        }
        if (inline !== undefined) {
            given.set(name, { type: "value", value: inline })
            continue
        }
        const next = input.argv[index + 1]
        if (next === undefined || next.startsWith("--")) {
            given.set(name, { type: "empty" })
            continue
        }
        given.set(name, { type: "value", value: next })
        index++
    }

    const asking = input.prompt === true && !errors.length
    const values: Record<string, unknown> = {}
    for (const name of names) {
        const option = options[name]!
        const typed = given.get(name) ?? { type: "absent" }
        if (asking && !input.argv.length) {
            values[name] = await prompt(name, option, undefined)
            continue
        }
        const value = await valueOf(name, option, typed)
        if (value.ok) {
            values[name] = value.value
            continue
        }
        if (asking) {
            values[name] = await prompt(name, option, typed.type === "value" ? String(typed.value) : undefined)
            continue
        }
        errors.unshift(...value.value)
    }

    if (errors.length) {
        const error = { errors: sortByOption(errors, names), message: "Invalid options", name: "CLIOptionsError" as const }
        return { error, message: message(error.errors, input.command) }
    }
    return { options: values as InferOptions<C> }
}

async function valueOf(name: string, option: CommandOption, given: Given): Promise<Result<unknown, CLIOptionError[]>> {
    const flag = `--${String.kebabCase(name)}`
    if (given.type === "empty") return Err([{ message: `Missing a value for ${flag}`, meta: { option: name }, name: "CLIMissingValueError" as const }])

    if (option.kind === "boolean") {
        const value = given.type === "value" ? given.value : option.config.default
        if (value === true || value === "true") return Ok(true)
        if (value === false || value === "false") return Ok(false)
        return Err([invalidOption(name, "Must be true or false")])
    }

    if (option.kind === "enum") {
        const value = given.type === "value" ? String(given.value) : option.config.default
        const choices = Object.keys(option.config.options)
        if (value === undefined) return Err([{ message: `Missing option ${flag}`, meta: { option: name }, name: "CLIMissingOptionError" as const }])
        if (choices.includes(value)) return Ok(value)
        const suggestions = suggest(value, choices)
        const problem = suggestions.length
            ? `Must be one of: ${choices.join(", ")}, did you mean: ${suggestions.join(", ")}?`
            : `Must be one of: ${choices.join(", ")}`
        return Err([invalidOption(name, problem)])
    }

    const value = given.type === "value" ? String(given.value) : option.config.default
    if (value === undefined && option.config.optional) return Ok(undefined)
    if (value === undefined) return Err([{ message: `Missing option ${flag}`, meta: { option: name }, name: "CLIMissingOptionError" as const }])
    const parsed = await Parse.value(option.config.parse, value)
    if (parsed.ok) return Ok(parsed.value)
    return Err(parsed.value.map((problem) => invalidOption(name, problem)))
}

function invalidOption(name: string, problem: string): CLIInvalidOptionError {
    return { message: `Invalid option --${String.kebabCase(name)}: ${problem}`, meta: { option: name }, name: "CLIInvalidOptionError" }
}

function unknownOption(flag: string, flags: string[]): CLIUnknownOptionError {
    const typed = flag.replace(/^-+/, "")
    const suggestions = typed ? suggest(typed, flags.map((known) => known.slice(2))).map((known) => `--${known}`) : []
    const message = suggestions.length ? `Unknown option ${flag}, did you mean: ${suggestions.join(", ")}?` : `Unknown option ${flag}`
    return { message, meta: { input: flag, suggestions }, name: "CLIUnknownOptionError" }
}

function splitOnce(word: string, separator: string): [string, string | undefined] {
    const index = word.indexOf(separator)
    if (index === -1) return [word, undefined]
    return [word.slice(0, index), word.slice(index + 1)]
}

function sortByOption(errors: CLIOptionError[], names: string[]): CLIOptionError[] {
    const known = errors.filter((error) => "option" in error.meta).sort((a, b) => names.indexOf(optionOf(a)) - names.indexOf(optionOf(b)))
    const unknown = errors.filter((error) => !("option" in error.meta))
    return [...known, ...unknown]
}

function optionOf(error: CLIOptionError): string {
    return "option" in error.meta ? error.meta.option : ""
}

function message(errors: CLIOptionError[], command: AnyCommand): string {
    const options = command.config.options
    const flags = Object.keys(options).map((name) => `--${String.kebabCase(name)}`)
    const mentioned = new Set<string>()

    for (const error of errors) {
        if ("option" in error.meta) mentioned.add(error.meta.option)
        if ("suggestions" in error.meta) for (const flag of error.meta.suggestions) mentioned.add(Object.keys(options)[flags.indexOf(flag)]!)
    }

    const lines = errors.map((error) => colors.red(error.message.replaceAll(/--[\w-]+/g, (flag) => colors.cyan(flag))))
    const shown = Object.fromEntries(Object.entries(options).filter(([name]) => mentioned.has(name)))
    return Layout.paragraphs([lines.join("\n"), help(shown)])
}
