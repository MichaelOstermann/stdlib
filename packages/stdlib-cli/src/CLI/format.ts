import type { CLIError, Command, Option, Outcome } from "./types"
import { colors } from "./colors"

/**
 * # format
 *
 * ```ts
 * function CLI.format(outcome: Outcome): string
 * ```
 *
 * The text to print for the help or the errors of an outcome of `CLI.resolve`, and an empty string
 * for one that runs. `NothingToRun` is shown as the help.
 *
 * Help names the command as it is typed, and lists its commands and options. Errors list what went
 * wrong, one per line with what an unknown name could have meant, followed by the commands or
 * options they name, or all of them when they name none, and how to see all of them. Typed values
 * are never shown, only names.
 *
 * Errors are red, commands blue, flags cyan, headings bold and notes such as `(Optional)` dim, when
 * `CLI.shouldColor()` says so.
 *
 * ## Example
 *
 * ```ts
 * const outcome = await CLI.resolve(miko, ["members", "ad"], { interactive: false });
 * console.error(CLI.format(outcome));
 * // Unknown command: ad Did you mean: add
 * //
 * // Commands:
 * //   add  Add a member
 * //
 * // See all commands: miko members --help
 * ```
 */
export function format(outcome: Outcome): string {
    if (outcome.type === "run") return ""
    const { command } = outcome
    const typed = outcome.path.join(" ")
    if (outcome.type === "help") return help(command, typed)

    const { errors } = outcome
    if (errors[0]!.type === "NothingToRun") return help(command, typed)
    const lines = errors.map(line).join("\n")

    // The commands or options that are named, hidden ones too, otherwise every one help shows.
    if (errors[0]!.type === "UnknownCommand") {
        const named = errors.flatMap((error) => (error.type === "UnknownCommand" ? error.candidates : []))
        return paragraphs([lines, commandSection(named.length ? named : visibleCommands(command)), seeAll("commands", typed)])
    }
    const named = new Set(errors.flatMap((error) => (error.type === "UnknownFlag" ? error.candidates : "name" in error ? [error.name] : [])))
    const options = enabledOptions(command)
    const affected = options.filter(([name]) => named.has(name))
    return paragraphs([lines, optionSection(affected.length ? affected : options.filter(([, option]) => !option.hidden)), seeAll("options", typed)])
}

function help(command: Command, typed: string): string {
    return paragraphs([
        [colors.bold(typed), command.desc].filter(Boolean).join("\n"),
        commandSection(visibleCommands(command)),
        optionSection(enabledOptions(command).filter(([, option]) => !option.hidden)),
    ])
}

/** `See all options: miko members add --help` */
function seeAll(what: string, typed: string): string {
    return `See all ${what}: ${colors.blue(typed)} ${colors.cyan("--help")}`
}

function line(error: CLIError): string {
    switch (error.type) {
        case "UnknownCommand": return `${colors.red("Unknown command:")} ${colors.blue(error.value)}${didYouMean(error.candidates.map((command) => colors.blue(command.name)))}`
        case "UnknownFlag": return `${colors.red("Unknown flag:")} ${colors.cyan(error.value)}${didYouMean(error.candidates.map((name) => colors.cyan(flag(name))))}`
        case "NothingToRun": return ""
        case "MissingFlag": return `${colors.red("Missing flag:")} ${colors.cyan(flag(error.name))}`
        case "InvalidFlag": return `${colors.red("Invalid flag:")} ${colors.cyan(flag(error.name))} ${error.message}`
        case "RepeatedFlag": return `${colors.red("Invalid flag:")} ${colors.cyan(flag(error.name))} Given more than once`
    }
}

function didYouMean(names: string[]): string {
    return names.length ? ` Did you mean: ${names.join(", ")}` : ""
}

function heading(text: string): string {
    return colors.bold(`${text}:`)
}

/** `firstName` is given as `--first-name`. */
function flag(name: string): string {
    return `--${String.kebabCase(name)}`
}

function visibleCommands(command: Command): Command[] {
    return command.commands.filter((command) => command.enabled && !command.hidden)
}

/** The options that exist, the ones that have to be given first. */
function enabledOptions(command: Command): [string, Option][] {
    const options = Object.entries(command.options).filter(([, option]) => option.enabled)
    return [...options.filter(([, option]) => isRequired(option)), ...options.filter(([, option]) => !isRequired(option))]
}

function isRequired(option: Option): boolean {
    return !option.optional && option.default === undefined
}

function commandSection(commands: Command[]): string {
    if (!commands.length) return ""
    return `${heading("Commands")}\n${commandTable(commands)}`
}

function optionSection(options: [string, Option][]): string {
    if (!options.length) return ""
    return `${heading("Options")}\n${optionTable(options)}`
}

function commandTable(commands: Command[]): string {
    return table(commands.map((command) => [command.name, command.desc]), colors.blue)
}

function optionTable(options: [string, Option][]): string {
    return table(options.map(([name, option]) => {
        const notes = [option.desc]
        if (option.default !== undefined) notes.push(colors.dim(`(Default: ${option.default})`))
        else if (option.optional) notes.push(colors.dim("(Optional)"))
        if (option.example !== undefined) notes.push(colors.dim(`(Example: ${option.example})`))
        return [flag(name), notes.filter(Boolean).join(" ")]
    }), colors.cyan)
}

/**
 * Two columns, indented by two spaces, the first one painted. The second one wraps to the width of
 * the terminal, when it is known and Bun can wrap it.
 */
function table(rows: [string, string][], paint: (text: string) => string): string {
    const width = Math.max(...rows.map(([left]) => left.length))
    const indent = " ".repeat(2 + width + 2)
    const columns = process.stdout.columns
    return rows
        .map(([left, right]) => {
            const wrapped = typeof Bun !== "undefined" && columns
                ? Bun.wrapAnsi(right, Math.max(columns - indent.length, 20), { hard: true })
                : right
            return `  ${paint(left)}${" ".repeat(width - left.length)}  ${wrapped.replaceAll("\n", `\n${indent}`)}`.trimEnd()
        })
        .join("\n")
}

function paragraphs(texts: string[]): string {
    return texts.filter(Boolean).join("\n\n")
}
