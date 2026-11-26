import type { JSON } from "@monstermann/stdlib"
import type { CLI } from "."
import { dim } from "./dim"
import { green } from "./green"
import { yellow } from "./yellow"

type Limits = { maxItems: number, maxString: number }

type Group = JSON.Object | JSON[] | readonly JSON[]

/**
 * # formatJSON
 *
 * Turns JSON into readable text that looks like YAML. With `compact`, the text always goes on one
 * line, and an object loses its outer braces.
 *
 * ## Example
 *
 * ```ts
 * CLI.formatJSON({ email: "jane@miko.dev", tags: ["admin"], seats: 1 })
 * // email: jane@miko.dev
 * // tags:
 * //   - admin
 * // seats: 1
 *
 * CLI.formatJSON({ email: "jane@miko.dev", tags: ["admin"] }, { compact: true })
 * // email: jane@miko.dev, tags: [admin]
 * ```
 */
export function formatJSON(value: JSON, options: CLI.FormatOptions = {}): string {
    const limits = { maxItems: options.maxItems ?? 100, maxString: options.maxString ?? 1000 }
    if (typeof value === "string") return value
    if (!isGroup(value)) return scalar(value)
    if (!options.compact) return groupLines(value, options.width ?? process.stdout.columns ?? 80, limits).join("\n")
    if (isArray(value)) return inlineArray(value, limits)
    return inlineEntries(value, limits)
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
    const dash = dim("- ")
    if (isMultiline(item)) return hang(dash, ["|", ...blockLines(item, width - 2, limits)])
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
    if (isMultiline(value)) return [`${head}|`, ...blockLines(value, width - 2, limits).map((line) => `  ${line}`)]
    if (!isGroup(value)) return hang(head, valueLines(value, Math.max(width - headWidth, 20), limits))
    if (isEmpty(value)) return [head + emptyText(value)]
    return [head.trimEnd(), ...groupLines(value, width - 2, limits).map((line) => `  ${line}`)]
}

function valueLines(value: boolean | number | string | null, width: number, limits: Limits): string[] {
    if (typeof value !== "string") return [scalar(value)]
    return Bun.wrapAnsi(stringText(value, limits), width, { hard: true }).split("\n")
}

/** Returns the lines of `string` as they are, like a block in YAML, each wrapped to `width`. */
function blockLines(string: string, width: number, limits: Limits): string[] {
    const cut = string.length <= limits.maxString ? string : string.slice(0, limits.maxString).trimEnd()
    const lines = cut.split("\n").flatMap((line) => Bun.wrapAnsi(line, width, { hard: true, trim: false }).split("\n")).map((line) => green(line))
    if (cut.length < string.length) lines.push(dim(`… ${string.length - cut.length} more characters`))
    return lines
}

function isMultiline(value: JSON): value is string {
    return typeof value === "string" && value.includes("\n")
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
    if (isEmpty(object)) return "{}"
    return `{ ${inlineEntries(object, limits)} }`
}

function inlineEntries(object: JSON.Object, limits: Limits): string {
    const entries = Object.entries(object)
    const items = entries.slice(0, limits.maxItems).map(([key, value]) => `${keyText(key)}: ${inline(value, limits)}`)
    if (entries.length > limits.maxItems) items.push(more(entries.length - limits.maxItems))
    return items.join(", ")
}

function stringText(string: string, limits: Limits): string {
    if (string.length <= limits.maxString) return green(Bun.YAML.stringify(string))
    const cut = string.slice(0, limits.maxString).trimEnd()
    return green(Bun.YAML.stringify(cut)) + dim(` … ${string.length - cut.length} more characters`)
}

function scalar(value: boolean | number | null): string {
    return yellow(String(value))
}

function keyText(key: string): string {
    return Bun.YAML.stringify(key)
}

/** Puts `head` before the first line. Indents the other lines to start below the end of `head`. */
function hang(head: string, lines: string[]): string[] {
    const padding = " ".repeat(Bun.stringWidth(head))
    return lines.map((line, index) => index === 0 ? head + line : padding + line)
}

function more(count: number): string {
    return dim(`… ${count} more`)
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
