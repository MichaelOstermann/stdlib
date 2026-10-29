import type { Token } from "../internals/Tokens"
import type { CLIError, Command, Option, Outcome } from "./types"
import { normalize } from "../internals/normalize"
import { Tokens } from "../internals/Tokens"

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
 * Names are settled before values: a command or flag that names nothing, or more than one, stops
 * there, as do words before the first flag. Then every option is read, and what is missing, invalid
 * or repeated is reported together.
 *
 * Casing and dashes never matter: `--firstName`, `--first-name` and `-FIRST_NAME` are the same
 * flag. When `interactive`, names can also be abbreviated, `mem a --fn` for
 * `members add --first-name`, as long as only one name fits.
 */
export async function resolve(program: Command, argv: string[], options: { interactive: boolean }): Promise<Outcome> {
    const tokens = Tokens(argv)
    const path = [program.name]
    let command = program

    // Commands: words up to the first flag, as long as the command has commands of its own.
    while (tokens.head && !tokens.head.isFlag() && command.commands.length) {
        const value = tokens.head.value
        const result = match(command.commands.filter((command) => command.enabled), value, options.interactive)
        if ("candidates" in result) return { command, errors: [{ candidates: result.candidates, type: "UnknownCommand", value }], path, type: "error" }
        command = result.match
        path.push(command.name)
        tokens.head.remove()
    }

    if (tokens.flags().some((token) => ["h", "help"].includes(normalize(token.value)))) return { command, path, type: "help" }
    if (!command.handler) return { command, errors: [{ type: "NothingToRun" }], path, type: "error" }
    const givenNothing = !tokens.head

    const flags = Object.entries(command.options).filter(([, option]) => option.enabled)
    const names = flags.map(([name, option]) => ({ hidden: option.hidden, name }))

    // Flag names: every flag names exactly one option, and no words come before the first one.
    const given = new Map<string, Token[]>()
    const nameErrors: CLIError[] = []
    while (tokens.head && !tokens.head.isFlag()) {
        const value = tokens.head.value
        const result = match(names, value, false)
        const candidates = "match" in result ? [result.match] : result.candidates
        nameErrors.push({ candidates: candidates.map(({ name }) => name), type: "UnknownFlag", value })
        tokens.head.remove()
    }
    for (const token of tokens.flags()) {
        const result = match(names, token.value, options.interactive)
        if ("candidates" in result) nameErrors.push({ candidates: result.candidates.map(({ name }) => name), type: "UnknownFlag", value: token.value })
        else given.set(result.match.name, [...given.get(result.match.name) ?? [], token])
    }
    if (nameErrors.length) return { command, errors: nameErrors, path, type: "error" }

    // Values: what each option was given, its default, or `undefined`, parsed.
    const values: Record<string, unknown> = {}
    const errors: CLIError[] = []
    for (const [name, option] of flags) {
        const result = await readFlag(name, option, given.get(name) ?? [])
        if ("error" in result) errors.push(result.error)
        else values[name] = result.value
    }

    // Words no flag took, after one that takes none: `--json extra`.
    for (let token = tokens.head; token; token = token.next) {
        const result = match(names, token.value, false)
        const candidates = "match" in result ? [result.match] : result.candidates
        errors.push({ candidates: candidates.map(({ name }) => name), type: "UnknownFlag", value: token.value })
    }

    if (errors.length && givenNothing) return { command, errors: [{ type: "NothingToRun" }], path, type: "error" }
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

/** Reads the flag where it was given, falls back to the default, and parses what it got. */
async function readFlag(name: string, option: Option, tokens: Token[]): Promise<{ error: CLIError } | { value: unknown }> {
    const given = tokens.map((token) => {
        const value = option.read(token)
        token.remove()
        return value
    })
    if (given.length > 1) return { error: { name, type: "RepeatedFlag" } }
    if (given.length === 1 && given[0] === undefined) return { error: { message: "Requires a value", name, type: "InvalidFlag" } }
    const value = given[0] ?? option.default
    if (value === undefined && option.optional) return { value: undefined }
    if (value === undefined) return { error: { name, type: "MissingFlag" } }

    try {
        return { value: await option.parse(value) }
    }
    catch (error) {
        return { error: { message: error instanceof Error ? error.message : String(error), name, type: "InvalidFlag" } }
    }
}
