import type { CLIError, Command, Option, Outcome } from "./types"
import { normalize } from "../internals/normalize"

/**
 * # resolve
 *
 * ```ts
 * function CLI.resolve(
 *     program: Command,
 *     argv: string[],
 *     options: { interactive: boolean },
 * ): Promise<Outcome>
 * ```
 *
 * Reads `argv` into what should happen, without printing or running anything: the command to run
 * with its values, its help, or every error that was found. `program` is the command the program
 * itself is, `argv` comes after its name.
 *
 * `--help` or `-h` anywhere after the commands asks for help, which wins over every other flag. A
 * command that only groups others, or that was given nothing and can't run without it, is a
 * `NothingToRun` error.
 *
 * A flag starts with `--`, and takes every word up to the next one as its value, joined with
 * spaces, also words that start with a single dash: `--name Mary Ann`, `--offset -5`. `--name=Mary`
 * is the same as `--name Mary`.
 *
 * Names are settled before values: a command or flag that names nothing, or more than one, stops
 * there, as do words before the first flag. Then every option is read, and what is missing, invalid
 * or repeated is reported together.
 *
 * Casing and dashes never matter: `--firstName`, `--first-name` and `--FIRST_NAME` are the same
 * flag. When `interactive`, names and choices can also be abbreviated, `mem a --fn` for
 * `members add --first-name`, as long as only one fits.
 */
export async function resolve(program: Command, argv: string[], options: { interactive: boolean }): Promise<Outcome> {
    const path = [program.name]
    let command = program
    let words = argv

    // Commands: words up to the first one with a dash, as long as the command has commands of its own.
    while (words.length && !(words[0]!.length > 1 && words[0]!.startsWith("-")) && command.commands.length) {
        const value = words[0]!
        const result = match(command.commands.filter((command) => command.enabled), value, options.interactive)
        if ("candidates" in result) return { command, errors: [{ candidates: result.candidates, type: "UnknownCommand", value }], path, type: "error" }
        command = result.match
        path.push(command.name)
        words = words.slice(1)
    }

    if (words.some((word) => word.startsWith("-") && ["h", "help"].includes(normalize(word)))) return { command, path, type: "help" }
    if (!command.handler) return { command, errors: [{ type: "NothingToRun" }], path, type: "error" }

    const flags = Object.entries(command.options).filter(([, option]) => option.enabled)
    const names = flags.map(([name, option]) => ({ hidden: option.hidden, name }))

    // Flag names: every flag names exactly one option, and no words come before the first one.
    const given = new Map<string, string[][]>()
    const nameErrors: CLIError[] = []
    let current: string[] | undefined
    for (const word of words) {
        if (!word.startsWith("--")) {
            if (current) current.push(word)
            else nameErrors.push({ candidates: suggest(names, word), type: "UnknownFlag", value: word })
            continue
        }
        const equals = word.indexOf("=")
        const value = equals === -1 ? word : word.slice(0, equals)
        current = equals === -1 ? [] : [word.slice(equals + 1)]
        const result = match(names, value, options.interactive)
        if ("candidates" in result) nameErrors.push({ candidates: result.candidates.map(({ name }) => name), type: "UnknownFlag", value })
        else given.set(result.match.name, [...given.get(result.match.name) ?? [], current])
    }
    if (nameErrors.length) return { command, errors: nameErrors, path, type: "error" }

    // Values: what each option was given, its default, or `undefined`, parsed.
    const values: Record<string, unknown> = {}
    const errors: CLIError[] = []
    for (const [name, option] of flags) {
        const result = await readFlag(name, option, given.get(name) ?? [], options.interactive)
        if ("error" in result) errors.push(result.error)
        else values[name] = result.value
    }

    if (errors.length && !words.length) return { command, errors: [{ type: "NothingToRun" }], path, type: "error" }
    if (errors.length) return { command, errors, path, type: "error" }
    return { command, path, type: "run", values }
}

/**
 * What `value` names: the one with the same name, otherwise, when interactive, the only visible one
 * it is an abbreviation of. Otherwise every visible one it could be an abbreviation of, best first.
 */
function match<T extends { hidden: boolean, name: string }>(items: T[], value: string, interactive: boolean): { candidates: T[] } | { match: T } {
    const name = normalize(value)
    // `--` or `-` has no name left to match, and an empty name would match everything.
    if (!name) return { candidates: [] }
    const exact = items.find((item) => normalize(item.name) === name)
    if (exact) return { match: exact }
    const candidates = items
        .filter((item) => !item.hidden)
        .map((item) => [item, String.score(item.name, name)] as const)
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([item]) => item)
    if (interactive && candidates.length === 1) return { match: candidates[0]! }
    return { candidates }
}

/** The names a word before the first flag could have meant. */
function suggest(names: { hidden: boolean, name: string }[], word: string): string[] {
    const result = match(names, word, false)
    return ("match" in result ? [result.match] : result.candidates).map(({ name }) => name)
}

/**
 * The words each time the flag was given, or its default, one of its choices, and parsed.
 */
async function readFlag(name: string, option: Option, given: string[][], interactive: boolean): Promise<{ error: CLIError } | { value: unknown }> {
    if (given.length > 1) return { error: { name, type: "RepeatedFlag" } }
    if (given[0]?.length === 0) return { error: { message: "Requires a value", name, type: "InvalidFlag" } }
    let value = given[0]?.join(" ") ?? option.default
    if (value === undefined && option.optional) return { value: undefined }
    if (value === undefined) return { error: { name, type: "MissingFlag" } }

    if (option.choices) {
        const result = match(option.choices.map((choice) => ({ hidden: false, name: choice })), value, interactive)
        if ("candidates" in result) {
            const message = result.candidates.length ? `Did you mean: ${result.candidates.map((choice) => choice.name).join(", ")}` : `Not one of: ${option.choices.join(", ")}`
            return { error: { message, name, type: "InvalidFlag" } }
        }
        value = result.match.name
    }

    try {
        return { value: await option.parse(value) }
    }
    catch (error) {
        return { error: { message: error instanceof Error ? error.message : String(error), name, type: "InvalidFlag" } }
    }
}
