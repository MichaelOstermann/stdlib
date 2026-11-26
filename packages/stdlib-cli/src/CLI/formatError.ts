import type { CLI } from "."
import { Failure } from "@monstermann/stdlib"
import { bold } from "./bold"
import { dim } from "./dim"
import { formatJSON } from "./formatJSON"
import { red } from "./red"

/**
 * # formatError
 *
 * Turns an error into readable text. The text includes the details, `cause` and `errors` of the
 * error, and with `stack`, its stack.
 *
 * ## Example
 *
 * ```ts
 * const cause = { host: "db.miko.dev", message: "fetch failed", name: "Error" }
 * CLI.formatError({ cause, message: "Could not add the member", name: "SaveError", status: 503 })
 * // SaveError: Could not add the member
 * //   status: 503
 * //   cause: Error: fetch failed
 * //     host: db.miko.dev
 * ```
 */
export function formatError(error: unknown, options: CLI.FormatErrorOptions = {}): string {
    const width = options.width ?? process.stdout.columns ?? 80
    return failureLines(Failure.from(error), { ...options, width }).join("\n")
}

function failureLines(failure: Failure, options: CLI.FormatErrorOptions & { width: number }): string[] {
    const nested = { ...options, width: options.width - 2 }
    const lines = headerLines(failure)
    const details = Failure.details(failure)

    if (Object.keys(details).length) lines.push(...indent(formatJSON(details, nested).split("\n")))

    if (options.stack) lines.push(...indent(stackLines(failure)))

    if (failure.cause) {
        const [header, ...rest] = failureLines(failure.cause, nested)
        lines.push(...indent([`cause: ${header}`, ...rest]))
    }

    if (failure.errors?.length) {
        const items = failure.errors.flatMap((item) => hang(dim("- "), failureLines(item, { ...nested, width: nested.width - 2 })))
        lines.push(...indent(["errors:", ...indent(items)]))
    }

    return lines
}

/** Returns the lines of the stack below its first line, which repeats the name and the message. */
function stackLines(failure: Failure): string[] {
    if (!failure.stack) return []
    const header = failure.message ? `${failure.name}: ${failure.message}` : failure.name
    const frames = failure.stack.startsWith(header) ? failure.stack.slice(header.length) : failure.stack
    return frames.split("\n").map((line) => line.trim()).filter((line) => line).map((line) => dim(line))
}

function headerLines(failure: Failure): string[] {
    if (!failure.message) return [red(bold(failure.name))]
    const [first, ...rest] = failure.message.split("\n")
    return [red(`${bold(failure.name)}: ${first}`), ...rest.map((line) => red(line))]
}

function indent(lines: string[]): string[] {
    return lines.map((line) => `  ${line}`)
}

function hang(head: string, lines: string[]): string[] {
    const padding = " ".repeat(Bun.stringWidth(head))
    return lines.map((line, index) => index === 0 ? head + line : padding + line)
}
