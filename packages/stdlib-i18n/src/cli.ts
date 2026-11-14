import type { I18nDiagnostic, I18nResult } from "./types"
import { CLI } from "@monstermann/stdlib-cli"
import { compile } from "./compile"

const program = CLI
    .command()
    .desc("Compiles YAML files with ICU messages into TypeScript")
    .option("messages", CLI
        .string()
        .desc("Globs of the YAML files")
        .example("i18n/*.yaml")
        .parse((value) => Ok(value.split(/\s+/))))
    .option("output", CLI
        .string()
        .desc("The folder to generate the messages in")
        .example("app/i18n"))
    .action(async ({ messages, output }) => {
        const result = await compile({ messages, output }, process.cwd())
        if (result.errors.length) return Err(report(result))
        return Ok(report(result))
    })
    .format((result) => result.value)

await CLI.run(program, { name: "stdlib-i18n" })

function report({ errors, output, warnings }: I18nResult): string {
    const lines = [
        ...errors.map((error) => `${CLI.red(location(error))} ${error.message}`),
        ...warnings.map((warning) => `${CLI.yellow(location(warning))} ${warning.message}`),
    ]
    if (lines.length) lines.push("")

    if (output?.written) lines.push(`${CLI.green(output.path)} ${count(output.messages, "message")}`)
    if (output && !output.written) lines.push(CLI.dim(`${output.path} ${count(output.messages, "message")}, unchanged`))

    const counts = [count(errors.length, "error"), ...warnings.length ? [count(warnings.length, "warning")] : []]
    if (errors.length) lines.push(CLI.red(`${counts.join(", ")}, nothing written`))
    if (!errors.length && warnings.length) lines.push(CLI.yellow(count(warnings.length, "warning")))

    return lines.join("\n")
}

// `i18n/auth.yaml:3:5:`, which terminals and editors can jump to.
function location({ column, line, path }: I18nDiagnostic): string {
    return `${[path, line, column].filter((part) => part != null).join(":")}:`
}

function count(n: number, noun: string): string {
    return `${n} ${noun}${n === 1 ? "" : "s"}`
}
