import type { Token } from "../internals/Tokens"
import type { CLIError, Command, Option, Outcome } from "./types"
import { Tokens } from "../internals/Tokens"

/**
 * # resolve
 *
 * ```ts
 * function CLI.resolve(
 *     commands: Command[],
 *     argv: string[],
 *     options: { interactive: boolean },
 * ): Promise<Outcome>
 * ```
 *
 * Reads `argv` into what should happen, without printing or running anything: the command to run
 * with its values, the help of a command that only groups others, or every error that was found.
 *
 * Names are settled before values: an unknown or ambiguous command or flag stops there. Then every
 * option is read, and what is missing, invalid or left over is reported together.
 *
 * Casing and dashes never matter: `--firstName`, `--first-name` and `-FIRST_NAME` are the same
 * flag. When `interactive`, names can also be abbreviated, `mem a --fn` for
 * `members add --first-name`, as long as only one name fits.
 */
export async function resolve(commands: Command[], argv: string[], options: { interactive: boolean }): Promise<Outcome> {
    const tokens = Tokens(argv)
    const path: string[] = []
    let command = root(commands)

    // Commands: words up to the first flag, as long as the command has commands of its own.
    while (tokens.head && !tokens.head.isFlag() && command.commands.length) {
        const value = tokens.head.value
        const candidates = matchCommand(command.commands, value, options.interactive)
        if (candidates.length === 0) return { command, errors: [{ type: "UnknownCommand", value }], path, type: "error" }
        if (candidates.length > 1) return { command, errors: [{ candidates, type: "AmbiguousCommand", value }], path, type: "error" }
        command = candidates[0]!
        path.push(command.name)
        tokens.head.remove()
    }

    const flags = Object.entries(command.options).filter(([, option]) => option.enabled)

    // Flag names: every flag names exactly one option, or nothing is read.
    const matched = new Map<string, Token>()
    const nameErrors: CLIError[] = []
    for (const token of tokens.flags()) {
        const candidates = matchFlag(flags, token.value, options.interactive)
        if (candidates.length === 0) nameErrors.push({ type: "UnknownFlag", value: token.value })
        else if (candidates.length > 1) nameErrors.push({ candidates, type: "AmbiguousFlag", value: token.value })
        else if (!matched.has(candidates[0]!)) matched.set(candidates[0]!, token)
    }
    if (nameErrors.length) return { command, errors: nameErrors, path, type: "error" }

    // Values: what each option was given, its default, or `undefined`, parsed.
    const values: Record<string, unknown> = {}
    const errors: CLIError[] = []
    for (const [name, option] of flags) {
        const result = await readFlag(name, option, matched.get(name))
        if ("error" in result) errors.push(result.error)
        else values[name] = result.value
    }

    // Whatever no option took.
    for (let token = tokens.head; token; token = token.next) errors.push({ type: "UnexpectedArgument", value: token.value })

    if (errors.length) return { command, errors, path, type: "error" }
    if (!command.handler) return { command, path, type: "help" }
    return { command, path, type: "run", values }
}

/** The commands at the top, as the commands of a command without a name. */
function root(commands: Command[]): Command {
    return { commands, desc: "", enabled: true, handler: undefined, hidden: false, name: "", options: {} }
}

/** `firstName`, `first-name`, `FIRST_NAME` and `--first-name` are all `firstname`. */
function normalize(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "").toLowerCase()
}

/**
 * The commands `value` could mean, best first: the one with the same name, otherwise, when
 * interactive, every visible one it is an abbreviation of.
 */
function matchCommand(commands: Command[], value: string, interactive: boolean): Command[] {
    // `--` or `-` has no name left to match, and an empty name would match everything.
    if (!normalize(value)) return []
    const enabled = commands.filter((command) => command.enabled)
    const exact = enabled.filter((command) => normalize(command.name) === normalize(value))
    if (exact.length) return exact
    if (!interactive) return []
    return enabled
        .filter((command) => !command.hidden)
        .map((command) => [command, String.score(normalize(command.name), normalize(value))] as const)
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([command]) => command)
}

/** The names of the options `value` could mean, best first, like `matchCommand`. */
function matchFlag(flags: [string, Option][], value: string, interactive: boolean): string[] {
    // `--` or `-` has no name left to match, and an empty name would match everything.
    if (!normalize(value)) return []
    const exact = flags.filter(([name]) => normalize(name) === normalize(value))
    if (exact.length) return exact.map(([name]) => name)
    if (!interactive) return []
    return flags
        .filter(([, option]) => !option.hidden)
        .map(([name]) => [name, String.score(normalize(name), normalize(value))] as const)
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
}

/**
 * Takes the flag and every word up to the next flag, joined with spaces: `--name Mary Ann` is
 * `Mary Ann`, as is `--name=Mary Ann`. Falls back to the default, and parses what it got.
 */
async function readFlag(name: string, option: Option, token: Token | undefined): Promise<{ error: CLIError } | { value: unknown }> {
    const words: Token[] = []
    for (let next = token?.next; next && !next.isFlag(); next = next.next) {
        words.push(next)
    }
    const given = words.length ? words.map((word) => word.value).join(" ") : undefined
    token?.remove()
    for (const word of words) word.remove()

    if (token && given === undefined) return { error: { message: "Requires a value", name, type: "InvalidFlag" } }
    const value = given ?? option.default
    if (value === undefined && option.optional) return { value: undefined }
    if (value === undefined) return { error: { name, type: "MissingFlag" } }

    try {
        return { value: await option.parse(value) }
    }
    catch (error) {
        return { error: { message: error instanceof Error ? error.message : String(error), name, type: "InvalidFlag" } }
    }
}
