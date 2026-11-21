import type { JSON } from "@monstermann/stdlib"
import { ansi } from "../ansi"

export interface FormatOptions {
    /**
     * One line like `{ email: jane@miko.dev, seats: 1 }` when everything fits into `width`, off by
     * default.
     */
    compact?: boolean
    /** Items of an array or object shown before `… 3 more`, 100 by default. */
    maxItems?: number
    /** Characters of a string shown before `… 3 more characters`, 1000 by default. */
    maxString?: number
    /** The columns to fit into, the terminal by default. */
    width?: number
}

type Limits = { maxItems: number, maxString: number }

type Group = JSON.Object | JSON[] | readonly JSON[]

/**
 * # json
 *
 * Turns JSON into readable text, like YAML. With `compact`, on one line when it fits.
 *
 * ## Example
 *
 * ```ts
 * CLI.format.json({ email: "jane@miko.dev", tags: ["admin"], seats: 1 })
 * // email: jane@miko.dev
 * // tags:
 * //   - admin
 * // seats: 1
 *
 * CLI.format.json({ email: "jane@miko.dev", tags: ["admin"] }, { compact: true })
 * // { email: jane@miko.dev, tags: [admin] }
 * ```
 */
export function json(value: JSON, options: FormatOptions = {}): string {
    const limits = { maxItems: options.maxItems ?? 100, maxString: options.maxString ?? 1000 }
    const width = options.width ?? process.stdout.columns ?? 80
    if (typeof value === "string") return value
    if (!isGroup(value)) return scalar(value)
    const flat = options.compact ? inline(value, limits) : undefined
    if (flat !== undefined && Bun.stringWidth(flat) <= width) return flat
    return groupLines(value, width, limits).join("\n")
}

function groupLines(group: Group, width: number, limits: Limits): string[] {
    if (isArray(group)) return arrayLines(group, width, limits)
    return objectLines(group, width, limits)
}

function arrayLines(array: readonly JSON[], width: number, limits: Limits): string[] {
    if (!array.length) return [emptyText(array)]
    const lines = array.slice(0, limits.maxItems).flatMap((item) => itemLines(item, width, limits))
    if (array.length > limits.maxItems) lines.push(more(array.length - limits.maxItems))
    return lines
}

function itemLines(item: JSON, width: number, limits: Limits): string[] {
    const dash = ansi.dim("- ")
    if (!isGroup(item)) return hang(dash, valueLines(item, width - 2, limits))
    return hang(dash, groupLines(item, width - 2, limits))
}

function objectLines(object: JSON.Object, width: number, limits: Limits): string[] {
    const entries = Object.entries(object)
    if (!entries.length) return [emptyText(object)]
    const lines = entries.slice(0, limits.maxItems).flatMap(([key, value]) => entryLines(key, value, width, limits))
    if (entries.length > limits.maxItems) lines.push(more(entries.length - limits.maxItems))
    return lines
}

function entryLines(key: string, value: JSON, width: number, limits: Limits): string[] {
    const head = `${keyText(key)}: `
    const headWidth = Bun.stringWidth(head)
    if (!isGroup(value)) return hang(head, valueLines(value, Math.max(width - headWidth, 20), limits))
    if (isEmpty(value)) return [head + emptyText(value)]
    return [head.trimEnd(), ...groupLines(value, width - 2, limits).map((line) => `  ${line}`)]
}

function valueLines(value: boolean | number | string | null, width: number, limits: Limits): string[] {
    if (typeof value !== "string") return [scalar(value)]
    return Bun.wrapAnsi(stringText(value, limits), width, { hard: true }).split("\n")
}

function inline(value: JSON, limits: Limits): string {
    if (typeof value === "string") return stringText(value, limits)
    if (isArray(value)) return inlineArray(value, limits)
    if (isGroup(value)) return inlineObject(value, limits)
    return scalar(value)
}

function inlineArray(array: readonly JSON[], limits: Limits): string {
    const items = array.slice(0, limits.maxItems).map((item) => inline(item, limits))
    if (array.length > limits.maxItems) items.push(more(array.length - limits.maxItems))
    return `[${items.join(", ")}]`
}

function inlineObject(object: JSON.Object, limits: Limits): string {
    const entries = Object.entries(object)
    if (!entries.length) return "{}"
    const items = entries.slice(0, limits.maxItems).map(([key, value]) => `${keyText(key)}: ${inline(value, limits)}`)
    if (entries.length > limits.maxItems) items.push(more(entries.length - limits.maxItems))
    return `{ ${items.join(", ")} }`
}

function stringText(string: string, limits: Limits): string {
    if (string.length <= limits.maxString) return ansi.green(Bun.YAML.stringify(string))
    const cut = string.slice(0, limits.maxString).trimEnd()
    return ansi.green(Bun.YAML.stringify(cut)) + ansi.dim(` … ${string.length - cut.length} more characters`)
}

function scalar(value: boolean | number | null): string {
    return ansi.yellow(String(value))
}

function keyText(key: string): string {
    return Bun.YAML.stringify(key)
}

/** Every line after the first lined up below where `head` ends. */
function hang(head: string, lines: string[]): string[] {
    const padding = " ".repeat(Bun.stringWidth(head))
    return lines.map((line, index) => index === 0 ? head + line : padding + line)
}

function more(count: number): string {
    return ansi.dim(`… ${count} more`)
}

function isEmpty(group: Group): boolean {
    if (isArray(group)) return !group.length
    return !Object.keys(group).length
}

function emptyText(group: Group): string {
    if (isArray(group)) return "[]"
    return "{}"
}

function isGroup(value: JSON): value is Group {
    return typeof value === "object" && value !== null
}

function isArray(value: JSON): value is readonly JSON[] {
    return Array.isArray(value)
}
