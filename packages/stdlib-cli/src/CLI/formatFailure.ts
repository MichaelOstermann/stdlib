import type { FormatOptions } from "./formatJSON"
import { colors } from "../internals/colors"
import { formatJSON } from "./formatJSON"

/**
 * # formatFailure
 *
 * ```ts
 * function CLI.formatFailure(failure: Failure, options?: FormatOptions): string
 * ```
 *
 * Turns a `Failure` into text for a person: `name: message` in red, its `meta` below like
 * `CLI.formatJSON` shows it, then its `cause` and its `errors`, each indented.
 *
 * ## Example
 *
 * ```ts
 * const cause = Failure.of("Error", "fetch failed", { meta: { host: "db.miko.dev" } })
 * CLI.formatFailure(Failure.of("SaveError", "Could not add the member", { cause, meta: { status: 503 } }))
 * // SaveError: Could not add the member
 * //   status: 503
 * //   cause: Error: fetch failed
 * //     host: db.miko.dev
 * ```
 */
export function formatFailure(failure: Failure, options: FormatOptions = {}): string {
    const width = options.width ?? process.stdout.columns ?? 80
    return failureLines(failure, { ...options, width }).join("\n")
}

function failureLines(failure: Failure, options: FormatOptions & { width: number }): string[] {
    const nested = { ...options, width: options.width - 2 }
    const lines = headerLines(failure)

    if (failure.meta && Object.keys(failure.meta).length) lines.push(...indent(formatJSON(failure.meta, nested).split("\n")))

    if (failure.cause) {
        const [header, ...rest] = failureLines(failure.cause, nested)
        lines.push(...indent([`cause: ${header}`, ...rest]))
    }

    if (failure.errors?.length) {
        const items = failure.errors.flatMap((item) => hang(colors.dim("- "), failureLines(item, { ...nested, width: nested.width - 2 })))
        lines.push(...indent(["errors:", ...indent(items)]))
    }

    return lines
}

function headerLines(failure: Failure): string[] {
    if (!failure.message) return [colors.red(colors.bold(failure.name))]
    const [first, ...rest] = failure.message.split("\n")
    return [colors.red(`${colors.bold(failure.name)}: ${first}`), ...rest.map((line) => colors.red(line))]
}

function indent(lines: string[]): string[] {
    return lines.map((line) => `  ${line}`)
}

function hang(head: string, lines: string[]): string[] {
    const padding = " ".repeat(Bun.stringWidth(head))
    return lines.map((line, index) => index === 0 ? head + line : padding + line)
}
