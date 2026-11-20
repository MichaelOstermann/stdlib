import type { Mark } from "../../internals/Snippet"
import type { Execution } from "../exec"
import type { ResolvedArgv, ResolvedFlag } from "../resolve/argv"
import type { CLIError, CLIInternalError, CLIInvalidOptionError, CLIMissingOptionError, CLIOptionsError, CommandOptions, ResolvedCommand } from "../types"
import { Layout } from "../../internals/Layout"
import { quote } from "../../internals/quote"
import { Snippet } from "../../internals/Snippet"
import { suggest } from "../../internals/suggest"
import { ansi } from "../ansi"
import { boolean } from "../boolean"
import { commands } from "../commands"
import { help } from "../help"
import { error } from "./error"
import { json } from "./json"

/**
 * # exec
 *
 * The text `CLI.run` prints for what `CLI.exec` returned.
 *
 * ## Example
 *
 * ```ts
 * const execution = await CLI.exec(miko, { name: "miko" })
 * process.stdout.write(`${CLI.format.exec(execution)}\n`)
 * ```
 */
export function exec(execution: Execution): string {
    const { command, isHelp, isRPC, result } = execution
    if (isRPC) return JSON.stringify({ ok: result.ok, value: result.value })
    if (!result.ok) return failureText(execution, result.value)
    if (isHelp && command) return help.command(command.command, { globalOptions: { help: boolean().desc("Show this help") }, path: [execution.name, ...command.path] })
    if (result.value === null) return ""
    return json(result.value)
}

type Problem = {
    /** The words of the command line it is about. */
    marks: Mark[]
    /** The option it suggests when there is only one. */
    suggests?: string
    text: string
}

function failureText(execution: Execution, failure: CLIError | Failure): string {
    if (failure.name === "CLIUnknownCommandError") return unknownCommandText(execution)
    if (failure.name === "CLIOptionsError") return optionsText(execution, failure as CLIOptionsError)
    if (failure.name === "CLIInternalError") return internalErrorText(failure as CLIInternalError)
    return error(failure)
}

function problemsText({ argv, name }: Execution, problems: Problem[], hint: string): string {
    const words = [name, ...argv.words]
    const blocks = problems.map((problem) => {
        if (!problem.marks.length) return ansi.red(problem.text)
        const marks = problem.marks.map((mark) => ({ ...mark, index: mark.index + 1, through: mark.through === undefined ? undefined : mark.through + 1 }))
        return [ansi.red(problem.text), ...Snippet.marked(words, marks)].join("\n")
    })
    return Layout.paragraphs([...blocks, hint])
}

function unknownCommandText(execution: Execution): string {
    const { argv, program } = execution
    const found = commands.nearest(program, argv.path)
    const index = found.path.length
    const typed = argv.path[index]!
    const options = found.command.config.options
    const option = optionNamed(options, typed)
    const children = Object.keys(found.command.config.commands)
    const suggestions = suggest(typed, children)
    const hint = helpHint(execution, found)

    if (option) return problemsText(execution, [{ marks: [{ index }], text: `Options start with --, did you mean: ${flagOf(option)}?` }], hint)
    if (!children.length) return problemsText(execution, [{ marks: [{ index }], text: "Not a command or option" }], hint)
    if (!suggestions.length) return problemsText(execution, [{ marks: [{ index }], text: "Unknown command" }], hint)
    return problemsText(execution, [{ marks: [{ index }], text: `Unknown command, did you mean: ${suggestions.join(", ")}?` }], hint)
}

function optionsText(execution: Execution, failure: CLIOptionsError): string {
    const { argv, command } = execution
    const options = command?.command.config.options ?? {}
    const unknown = failure.errors.filter((item) => item.name === "CLIUnknownOptionError").map((item) => item.meta.option)
    const flagProblems = unknown.filter((flag) => flag.startsWith("-")).map((flag) => unknownFlagProblem(argv, options, flag))
    const looseProblems = looseRuns(argv, unknown).map((run) => looseProblem(argv, options, run))
    const unknownProblems = [...flagProblems, ...looseProblems]
    const suggested = unknownProblems.map((problem) => problem.suggests)
    const problems = failure.errors.flatMap((item) => {
        if (item.name === "CLIInvalidOptionError") return [invalidProblem(argv, options, item)]
        if (item.name === "CLIMissingOptionError" && !suggested.includes(item.meta.option)) return [missingProblem(options, item)]
        return []
    })
    return problemsText(execution, [...problems, ...unknownProblems], command ? helpHint(execution, command) : "")
}

function unknownFlagProblem(argv: ResolvedArgv, options: CommandOptions, flag: string): Problem {
    const given = argv.flags[flag] ?? []
    const marks: Mark[] = given.map((item) => ({ index: item.index, part: item.inline ? "flag" : undefined }))
    const names = Object.keys(options)
    const typed = flag.replace(/^-+/, "")
    const isShort = !flag.startsWith("--")
    const startingWith = names.filter((name) => String.kebabCase(name).startsWith(typed))
    const byFlag = Object.fromEntries(names.map((name) => [String.kebabCase(name), name]))
    const suggested = isShort && startingWith.length ? startingWith : suggest(typed, Object.keys(byFlag)).map((kebab) => byFlag[kebab]!)
    if (!suggested.length) return { marks, text: "Unknown option" }
    const text = isShort ? "Options start with --" : "Unknown option"
    const suggests = suggested.length === 1 ? suggested[0] : undefined
    return { marks, suggests, text: `${text}, did you mean: ${suggested.map((name) => flagOf(name)).join(", ")}?` }
}

function looseProblem(argv: ResolvedArgv, options: CommandOptions, run: number[]): Problem {
    const words = run.map((index) => argv.words[index]!)
    const option = optionNamed(options, words[0]!)
    const before = valueBefore(argv, run[0]!)
    const beforeName = before ? Object.keys(options).find((name) => flagOf(name) === before.flag) : undefined

    if (option && words.length > 1 && !argv.flags[flagOf(option)]) {
        return { marks: [{ index: run[0]! }], suggests: option, text: `Options start with --, did you mean: ${flagOf(option)}?` }
    }

    if (before && beforeName && options[beforeName]!.kind === "string") {
        const value = [before.value, ...words].join(" ")
        const mark: Mark = before.inline ? { index: before.index, part: "value", through: run.at(-1) } : { index: before.index + 1, through: run.at(-1) }
        return { marks: [mark], text: `Values with spaces need quotes, did you mean: ${quote(value)}?` }
    }

    return { marks: run.map((index) => ({ index })), text: "Unknown option" }
}

function invalidProblem(argv: ResolvedArgv, options: CommandOptions, item: CLIInvalidOptionError): Problem {
    const name = item.meta.option
    const given = argv.flags[flagOf(name)] ?? []
    const first = given[0]
    const option = options[name]
    const example = option?.kind === "string" ? option.config.example : undefined

    if (given.length > 1) {
        const marks: Mark[] = given.map((entry) => ({ index: entry.index, part: entry.inline ? "flag" : undefined }))
        return { marks, text: item.message }
    }

    if (!first) return { marks: [], text: item.message }
    if (first.value === null && example) return { marks: [{ index: first.index }], text: `${item.message}, for example: ${flagOf(name)} ${quote(example)}` }
    if (first.value === null) return { marks: [{ index: first.index }], text: item.message }

    const mark: Mark = first.inline ? { index: first.index, part: "value" } : { index: first.index + 1 }
    if (option?.kind !== "enum") return { marks: [mark], text: item.message }

    const suggestions = suggest(first.value, Object.keys(option.config.options))
    if (!suggestions.length) return { marks: [mark], text: item.message }
    return { marks: [mark], text: `Unknown value, did you mean: ${suggestions.join(", ")}?` }
}

function missingProblem(options: CommandOptions, item: CLIMissingOptionError): Problem {
    const flag = flagOf(item.meta.option)
    const option = options[item.meta.option]
    const example = option?.kind === "string" ? option.config.example : undefined
    if (!example) return { marks: [], text: `Missing option ${flag}` }
    return { marks: [], text: `Missing option ${flag}, for example: ${flag} ${quote(example)}` }
}

function internalErrorText(failure: CLIInternalError): string {
    return error(failure.cause)
}

function helpHint({ name }: Execution, command: ResolvedCommand): string {
    return `${ansi.dim("See")} ${ansi.blue([name, ...command.path].join(" "))} ${ansi.cyan("--help")} ${ansi.dim("for more")}`
}

/** The words that belong to no flag, in runs of words that follow each other. */
function looseRuns(argv: ResolvedArgv, unknown: string[]): number[][] {
    const indexes = unknown
        .filter((flag) => !flag.startsWith("-"))
        .flatMap((flag) => (argv.flags[flag] ?? []).map((item) => item.index))
        .sort((a, b) => a - b)
    const runs: number[][] = []
    for (const index of indexes) {
        const run = runs.at(-1)
        if (run && run.at(-1) === index - 1) run.push(index)
        if (!run || run.at(-1) !== index) runs.push([index])
    }
    return runs
}

/** The flag whose value is the word right before `index`. */
function valueBefore(argv: ResolvedArgv, index: number): (ResolvedFlag & { flag: string, value: string }) | undefined {
    for (const [flag, given] of Object.entries(argv.flags)) {
        for (const item of given) {
            if (item.value === null) continue
            const valueIndex = item.inline ? item.index : item.index + 1
            if (valueIndex === index - 1) return { ...item, flag, value: item.value }
        }
    }
    return undefined
}

function optionNamed(options: CommandOptions, word: string): string | undefined {
    return Object.keys(options).find((name) => String.kebabCase(name) === String.kebabCase(word))
}

function flagOf(name: string): string {
    return `--${String.kebabCase(name)}`
}
