/* eslint-disable no-console */
import type { I18nDiagnostic } from "./types"
import { CLI } from "@monstermann/stdlib-cli"
import { compile } from "./compile"

await CLI.run(CLI.command({
    desc: "Compiles YAML files with ICU messages into TypeScript",
    name: "stdlib-i18n",
    options: {
        // Words are paths or globs, the shell may have expanded them already.
        messages: { desc: "Globs of the YAML files", example: "'i18n/*.yaml'", parse: (value) => value.split(/\s+/) },
        output: { desc: "The folder to generate the messages in", example: "app/i18n" },
    },
    async handler({ messages, output }) {
        const { errors, output: result, warnings } = await compile({ messages, output }, process.cwd())

        for (const error of errors) console.log(`${CLI.red(location(error))} ${error.message}`)
        for (const warning of warnings) console.log(`${CLI.yellow(location(warning))} ${warning.message}`)
        if (errors.length || warnings.length) console.log()

        if (result) {
            if (result.written) console.log(`${CLI.green(result.path)} ${count(result.messages, "message")}`)
            else console.log(CLI.dim(`${result.path} ${count(result.messages, "message")}, unchanged`))
        }

        if (errors.length) {
            const counts = [count(errors.length, "error"), ...warnings.length ? [count(warnings.length, "warning")] : []]
            console.log(CLI.red(`${counts.join(", ")}, nothing written`))
            process.exitCode = 1
            return
        }

        if (warnings.length) console.log(CLI.yellow(count(warnings.length, "warning")))
    },
}))

// `i18n/auth.yaml:3:5:`, which terminals and editors can jump to.
function location({ column, line, path }: I18nDiagnostic): string {
    return `${[path, line, column].filter((part) => part != null).join(":")}:`
}

function count(n: number, noun: string): string {
    return `${n} ${noun}${n === 1 ? "" : "s"}`
}
