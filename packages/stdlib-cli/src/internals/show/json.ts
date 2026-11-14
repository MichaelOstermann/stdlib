import type { ShowOptions } from "../../CLI/show"
import { colors } from "../colors"

type Limits = { maxItems: number, maxString: number }

type Group = JSONObject | JSONValue[] | readonly JSONValue[]

export function json(value: JSONValue, options: ShowOptions = {}): string {
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

function arrayLines(array: readonly JSONValue[], width: number, limits: Limits): string[] {
    if (!array.length) return [emptyText(array)]
    const lines = array.slice(0, limits.maxItems).flatMap((item) => itemLines(item, width, limits))
    if (array.length > limits.maxItems) lines.push(more(array.length - limits.maxItems))
    return lines
}

function itemLines(item: JSONValue, width: number, limits: Limits): string[] {
    const dash = colors.dim("- ")
    if (!isGroup(item)) return hang(dash, valueLines(item, width - 2, limits))
    return hang(dash, groupLines(item, width - 2, limits))
}

function objectLines(object: JSONObject, width: number, limits: Limits): string[] {
    const entries = Object.entries(object)
    if (!entries.length) return [emptyText(object)]
    const lines = entries.slice(0, limits.maxItems).flatMap(([key, value]) => entryLines(key, value, width, limits))
    if (entries.length > limits.maxItems) lines.push(more(entries.length - limits.maxItems))
    return lines
}

function entryLines(key: string, value: JSONValue, width: number, limits: Limits): string[] {
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

function inline(value: JSONValue, limits: Limits): string {
    if (typeof value === "string") return stringText(value, limits)
    if (isArray(value)) return inlineArray(value, limits)
    if (isGroup(value)) return inlineObject(value, limits)
    return scalar(value)
}

function inlineArray(array: readonly JSONValue[], limits: Limits): string {
    const items = array.slice(0, limits.maxItems).map((item) => inline(item, limits))
    if (array.length > limits.maxItems) items.push(more(array.length - limits.maxItems))
    return `[${items.join(", ")}]`
}

function inlineObject(object: JSONObject, limits: Limits): string {
    const entries = Object.entries(object)
    if (!entries.length) return "{}"
    const items = entries.slice(0, limits.maxItems).map(([key, value]) => `${keyText(key)}: ${inline(value, limits)}`)
    if (entries.length > limits.maxItems) items.push(more(entries.length - limits.maxItems))
    return `{ ${items.join(", ")} }`
}

function stringText(string: string, limits: Limits): string {
    if (string.length <= limits.maxString) return colors.green(Bun.YAML.stringify(string))
    const cut = string.slice(0, limits.maxString).trimEnd()
    return colors.green(Bun.YAML.stringify(cut)) + colors.dim(` … ${string.length - cut.length} more characters`)
}

function scalar(value: boolean | number | null): string {
    return colors.yellow(String(value))
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
    return colors.dim(`… ${count} more`)
}

function isEmpty(group: Group): boolean {
    if (isArray(group)) return !group.length
    return !Object.keys(group).length
}

function emptyText(group: Group): string {
    if (isArray(group)) return "[]"
    return "{}"
}

function isGroup(value: JSONValue): value is Group {
    return typeof value === "object" && value !== null
}

function isArray(value: JSONValue): value is readonly JSONValue[] {
    return Array.isArray(value)
}
