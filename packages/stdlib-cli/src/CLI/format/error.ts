import type { FormatOptions } from "./json"
import { ansi } from "../ansi"
import { json } from "./json"

/**
 * # error
 *
 * Turns anything that went wrong into readable text, with its `meta`, `cause` and `errors`.
 *
 * ## Example
 *
 * ```ts
 * const cause = { message: "fetch failed", meta: { host: "db.miko.dev" }, name: "Error" }
 * CLI.format.error({ cause, message: "Could not add the member", meta: { status: 503 }, name: "SaveError" })
 * // SaveError: Could not add the member
 * //   status: 503
 * //   cause: Error: fetch failed
 * //     host: db.miko.dev
 * ```
 */
export function error(error: unknown, options: FormatOptions = {}): string {
    const width = options.width ?? process.stdout.columns ?? 80
    return failureLines(Failure.from(error), { ...options, width }).join("\n")
}

function failureLines(failure: Failure, options: FormatOptions & { width: number }): string[] {
    const nested = { ...options, width: options.width - 2 }
    const lines = headerLines(failure)

    if (failure.meta && Object.keys(failure.meta).length) lines.push(...indent(json(failure.meta, nested).split("\n")))

    if (failure.cause) {
        const [header, ...rest] = failureLines(failure.cause, nested)
        lines.push(...indent([`cause: ${header}`, ...rest]))
    }

    if (failure.errors?.length) {
        const items = failure.errors.flatMap((item) => hang(ansi.dim("- "), failureLines(item, { ...nested, width: nested.width - 2 })))
        lines.push(...indent(["errors:", ...indent(items)]))
    }

    return lines
}

function headerLines(failure: Failure): string[] {
    if (!failure.message) return [ansi.red(ansi.bold(failure.name))]
    const [first, ...rest] = failure.message.split("\n")
    return [ansi.red(`${ansi.bold(failure.name)}: ${first}`), ...rest.map((line) => ansi.red(line))]
}

function indent(lines: string[]): string[] {
    return lines.map((line) => `  ${line}`)
}

function hang(head: string, lines: string[]): string[] {
    const padding = " ".repeat(Bun.stringWidth(head))
    return lines.map((line, index) => index === 0 ? head + line : padding + line)
}
