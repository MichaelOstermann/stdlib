import type { ShowOptions } from "../../CLI/show"
import { colors } from "../colors"
import { json } from "./json"

type Options = ShowOptions & { width: number }

export function error(value: Error, options: ShowOptions = {}): string {
    const width = options.width ?? process.stdout.columns ?? 80
    return errorLines(Error.from(value), new Set(), { ...options, width }).join("\n")
}

function errorLines(error: Error, seen: Set<Error>, options: Options): string[] {
    seen.add(error)
    const nested = { ...options, width: options.width - 2 }
    const lines = headerLines(error)

    const fields = fieldsOf(error)
    if (Object.keys(fields).length) lines.push(...indent(json(fields, nested).split("\n")))

    const cause = read(() => error.cause)
    if (cause instanceof Error && !seen.has(cause)) {
        const [header, ...rest] = errorLines(cause, seen, nested)
        lines.push(...indent([`cause: ${header}`, ...rest]))
    }

    const errors = read(() => (error as { errors?: unknown }).errors)
    const items = Array.isArray(errors) ? errors.filter((item) => item instanceof Error && !seen.has(item)) : []
    if (items.length) {
        const itemLines = items.flatMap((item) => hang(colors.dim("- "), errorLines(item, seen, { ...nested, width: nested.width - 2 })))
        lines.push(...indent(["errors:", ...indent(itemLines)]))
    }

    return lines
}

function headerLines(error: Error): string[] {
    const name = read(() => error.name) || "Error"
    const message = read(() => error.message)
    if (!message) return [colors.red(colors.bold(name))]
    const [first, ...rest] = message.split("\n")
    return [colors.red(`${colors.bold(name)}: ${first}`), ...rest.map((line) => colors.red(line))]
}

function fieldsOf(error: Error): JSONObject {
    const keys = read(() => Object.keys(error)) ?? []
    const entries = keys
        .filter((key) => key !== "name" && key !== "message" && key !== "stack" && key !== "cause" && key !== "errors")
        .map((key) => [key, jsonOf(read(() => (error as unknown as Record<string, unknown>)[key]))] as const)
        .filter((entry): entry is readonly [string, JSONValue] => entry[1] !== undefined)
    return Object.fromEntries(entries)
}

function jsonOf(value: unknown): JSONValue | undefined {
    try {
        const text = JSON.stringify(value)
        if (text === undefined) return undefined
        return JSON.parse(text) as JSONValue
    }
    catch {
        return undefined
    }
}

function read<T>(get: () => T): T | undefined {
    try {
        return get()
    }
    catch {
        return undefined
    }
}

function indent(lines: string[]): string[] {
    return lines.map((line) => `  ${line}`)
}

function hang(head: string, lines: string[]): string[] {
    const padding = " ".repeat(Bun.stringWidth(head))
    return lines.map((line, index) => index === 0 ? head + line : padding + line)
}
