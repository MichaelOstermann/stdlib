import type { Option, Part } from "./parse"
import type { I18nDiagnostic, I18nOptions, I18nResult } from "./types"
import { join, normalize } from "node:path"
import { $ } from "bun"
import { parse, ParseError } from "./parse"

type Report = { errors: I18nDiagnostic[], warnings: I18nDiagnostic[] }

type Message = {
    key: string
    langLines: Map<string, number>
    langs: Map<string, Part[]>
    line: number
    path: string
}

/** The messages of one `messages` glob, and every language any of them has. */
type MessageSet = { langs: string[], messages: Map<string, Message> }

/** The keys below a group by their last part: `{ auth: { signIn: "auth.signIn" } }` */
type Tree = Map<string, string | Tree>

type PropType = "date" | "number" | "string" | "text"
type Helper = keyof typeof helpers

// A plain argument is the least specific use of a prop, a number or date the most.
const ranks: Record<PropType, number> = { date: 2, number: 2, string: 1, text: 0 }
const types: Record<PropType, string> = { date: "Date | number", number: "number", string: "string", text: "number | string" }

// What `a.b` allows for `b`, reserved words included.
const identifierName = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u

// `key:`, `"key":` or `'key':` at the start of a line, and indented for a language below a key.
const keyLine = /^(?<indent>\s*)(?:"(?<double>[^"]*)"\s*|'(?<single>[^']*)'\s*|(?<plain>[^\s#"'-][^:#]*)):(?:\s|$)/

/**
 * The functions of a generated file that create `Intl` formatters, each one once and only when it
 * is first used, which spares the languages nobody is using. A file gets the ones it calls.
 */
const helpers = {
    dateFormat: `const dateFormats = new Map<string, Intl.DateTimeFormat>()
const dateFormat = (lang: string, dateStyle: Intl.DateTimeFormatOptions["dateStyle"]): Intl.DateTimeFormat => getOrInsertComputed(dateFormats, \`\${lang} \${dateStyle}\`, () => new Intl.DateTimeFormat(lang, { dateStyle }))`,
    numberFormat: `const numberFormats = new Map<string, Intl.NumberFormat>()
const numberFormat = (lang: string): Intl.NumberFormat => getOrInsertComputed(numberFormats, lang, () => new Intl.NumberFormat(lang))`,
    pluralRules: `const pluralRulesCache = new Map<string, Intl.PluralRules>()
const pluralRules = (lang: string, type: Intl.PluralRuleType = "cardinal"): Intl.PluralRules => getOrInsertComputed(pluralRulesCache, \`\${lang} \${type}\`, () => new Intl.PluralRules(lang, { type }))`,
    timeFormat: `const timeFormats = new Map<string, Intl.DateTimeFormat>()
const timeFormat = (lang: string, timeStyle: Intl.DateTimeFormatOptions["timeStyle"]): Intl.DateTimeFormat => getOrInsertComputed(timeFormats, \`\${lang} \${timeStyle}\`, () => new Intl.DateTimeFormat(lang, { timeStyle }))`,
}

// What the helpers share, `Map.prototype.getOrInsertComputed` once every webview has it.
const getOrInsertComputed = `function getOrInsertComputed<T>(map: Map<string, T>, key: string, value: () => T): T {
    let entry = map.get(key)
    if (entry) return entry
    entry = value()
    map.set(key, entry)
    return entry
}`

/**
 * Writes the messages of the YAML files into the `output` folder, as `index.ts` and `_messages.ts`.
 * Paths are relative to `root`.
 */
export async function compile(options: I18nOptions, root: string): Promise<I18nResult> {
    const report: Report = { errors: [], warnings: [] }
    // `./i18n/*.yaml` is `i18n/*.yaml` to git.
    const globs = options.messages.map((pattern) => new Bun.Glob(pattern.replace(/^(?:\.\/)+/, "")))
    const paths = (await findFiles(root)).filter((path) => globs.some((glob) => glob.match(path)))
    const messageSet = await readMessages(root, paths, report)

    report.errors.sort(byLocation)
    report.warnings.sort(byLocation)
    if (report.errors.length) return report

    const output = normalize(options.output)
    const files = compileFiles(messageSet)
    const written = await Promise.all(Object.entries(files).map(([name, contents]) => writeChanged(join(root, output, name), contents)))
    return { ...report, output: { messages: messageSet.messages.size, path: output, written: written.some(Boolean) } }
}

/** Tracked files and those that are new, without the ignored ones. */
async function findFiles(root: string): Promise<string[]> {
    const files = await $`git ls-files --cached --others --exclude-standard`.cwd(root).text()
    return files.split("\n").filter(Boolean)
}

function byLocation(a: I18nDiagnostic, b: I18nDiagnostic): number {
    return a.path.localeCompare(b.path) || (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0)
}

/** Leaves the file alone when nothing changed, so watchers do not fire. */
async function writeChanged(path: string, contents: string): Promise<boolean> {
    const file = Bun.file(path)
    const existing = await file.exists() ? await file.text() : undefined
    if (existing === contents) return false
    await Bun.write(file, contents)
    return true
}

async function readMessages(root: string, paths: string[], report: Report): Promise<MessageSet> {
    const messages = new Map<string, Message>()
    for (const path of paths) {
        const file = Bun.file(join(root, path))
        // `git ls-files` still lists files that were deleted but not yet staged.
        if (!await file.exists()) continue
        for (const message of parseMessages(path, await file.text(), report)) {
            const other = messages.get(message.key)
            if (other) report.warnings.push({ line: message.line, message: `${message.key}: already in ${other.path}:${other.line}`, path })
            else messages.set(message.key, message)
        }
    }

    checkNames(messages, report)

    const allLangs = [...messages.values()].flatMap((message) => [...message.langs.keys()])
    const langs = [...new Set(allLangs)].sort()
    for (const message of messages.values()) {
        const missing = langs.filter((lang) => !message.langs.has(lang))
        if (!missing.length) continue
        const names = missing.map((lang) => `"${lang}"`).join(", ")
        report.warnings.push({ line: message.line, message: `${message.key}: missing ${names}`, path: message.path })
    }
    return { langs, messages }
}

/**
 * Keys become names in the generated code: each part between dots is an identifier, a key is not
 * also the group of another one, and no two keys end up with the same name.
 */
function checkNames(messages: Map<string, Message>, report: Report): void {
    const error = (message: Message, text: string): void => {
        report.errors.push({ line: message.line, message: `${message.key}: ${text}`, path: message.path })
    }

    const valid = [...messages.values()].filter((message) => {
        const invalid = message.key.split(".").find((segment) => !identifierName.test(segment))
        if (invalid === undefined) return true
        // sign-out, sign out
        const renamed = invalid.replace(/[^\p{ID_Continue}$]+(.?)/gu, (_, next: string) => next.toUpperCase())
        const hint = identifierName.test(renamed) ? `, rename to ${JSON.stringify(renamed)}` : ""
        error(message, `${JSON.stringify(invalid)} is not an identifier${hint}`)
        return false
    })

    // The first key that has a group, and the key of each name.
    const groups = new Map<string, Message>()
    const names = new Map<string, Message>()
    for (const message of valid) {
        const segments = message.key.split(".")
        for (let i = 1; i < segments.length; i++) {
            const group = segments.slice(0, i).join(".")
            if (!groups.has(group)) groups.set(group, message)
        }
    }

    for (const message of valid) {
        const group = groups.get(message.key)
        if (group) error(message, `conflicts with ${group.key}`)
    }

    // auth.signIn and authSign.in
    for (const message of valid) {
        const name = nameOf(message.key)
        const other = names.get(name)
        if (other) error(message, `conflicts with ${other.key}`)
        else names.set(name, message)
    }
}

/** `auth.sign-in: { en: Sign in, de: Anmelden }`, one after another. */
function parseMessages(path: string, text: string, report: Report): Message[] {
    const yaml = parseYaml(path, text, report)
    if (!yaml) return []
    const locations = locate(text)

    return Object.entries(yaml).flatMap(([key, value]) => {
        const { langLines, line } = locations.get(key) ?? { langLines: new Map<string, number>(), line: 1 }
        const translations = translationsOf(value)
        if (!translations) {
            report.warnings.push({ line, message: `${key}: expected one message per language`, path })
            return []
        }

        const langs = new Map<string, Part[]>()
        for (const [lang, source] of translations) {
            try {
                langs.set(lang, parse(source))
            }
            catch (error) {
                if (!(error instanceof ParseError)) throw error
                const at = langLines.get(lang) ?? line
                report.errors.push({ line: at, message: `${key} (${lang}): ${(error as Error).message}`, path })
                // Not missing as well.
                langs.set(lang, [])
            }
        }
        return [{ key, langLines, langs, line, path }]
    })
}

/** The messages of a YAML file, nothing when it has none. */
function parseYaml(path: string, text: string, report: Report): Record<string, unknown> | undefined {
    let yaml: unknown
    try {
        yaml = Bun.YAML.parse(text)
    }
    catch (error) {
        // Bun does not tell where.
        report.errors.push({ message: (error as Error).message.replace(/^YAML Parse error: /, "invalid YAML: "), path })
        return
    }
    if (yaml == null) return
    if (!isRecord(yaml)) {
        report.warnings.push({ message: "expected messages", path })
        return
    }
    return yaml
}

/** `{ en: "Sign in", de: "Anmelden" }` as entries, nothing for anything else. */
function translationsOf(value: unknown): [string, string][] | undefined {
    if (!isRecord(value)) return
    const entries = Object.entries(value)
    if (!entries.length) return
    if (!entries.every(([, text]) => typeof text === "string")) return
    return entries as [string, string][]
}

function isRecord(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object") return false
    if (value === null) return false
    return !Array.isArray(value)
}

/**
 * The line of each key, and of each language below it. Keys start at the beginning of a line, which
 * is all this has to know about YAML.
 */
function locate(text: string): Map<string, Pick<Message, "langLines" | "line">> {
    const keys = new Map<string, Pick<Message, "langLines" | "line">>()
    let current: Pick<Message, "langLines" | "line"> | undefined
    for (const [index, source] of text.split("\n").entries()) {
        const groups = keyLine.exec(source)?.groups
        if (!groups) continue
        const name = groups["double"] ?? groups["single"] ?? groups["plain"]!.trimEnd()
        const line = index + 1
        if (!groups["indent"]) {
            current = { langLines: new Map(), line }
            if (!keys.has(name)) keys.set(name, current)
            continue
        }
        if (current && !current.langLines.has(name)) current.langLines.set(name, line)
    }
    return keys
}

/**
 * `index.ts` with the types and `m`, and `_messages.ts` with a function per message, named after
 * its key: `_authSignIn`. Files starting with `_` are left out of auto-imports by the editor, and
 * `m.auth.signIn` is rewritten to `_authSignIn` by stdlib-transform.
 */
function compileFiles({ langs, messages }: MessageSet): Record<"_messages.ts" | "index.ts", string> {
    const used = new Set<Helper>()
    const include = (helper: Helper): Helper => {
        used.add(helper)
        return helper
    }

    const keys = [...messages.keys()].sort()
    const compiled = keys.map((key) => compileMessage(nameOf(key), messages.get(key)!, langs, include))
    const declarations = [
        ...(used.size ? [getOrInsertComputed] : []),
        ...[...used].sort().map((helper) => helpers[helper]),
    ].map((declaration) => `${declaration}\n`)

    const tree: Tree = new Map()
    for (const key of keys) {
        const segments = key.split(".")
        let node = tree
        for (const segment of segments.slice(0, -1)) {
            if (!node.has(segment)) node.set(segment, new Map())
            node = node.get(segment) as Tree
        }
        node.set(segments.at(-1)!, key)
    }

    const object = (node: Tree, indent: string): string => {
        if (!node.size) return "{}"
        const members = [...node].map(([name, value]) => {
            const member = typeof value === "string" ? `messages.${nameOf(value)}` : object(value, `${indent}    `)
            return `${indent}    ${name}: ${member},`
        })
        return `{\n${members.join("\n")}\n${indent}}`
    }

    const header = [
        `// Generated by stdlib-i18n, do not edit.`,
        `// dprint-ignore-file`,
        ``,
    ]

    const index = [
        ...header,
        ...(keys.length ? [`import * as messages from "./_messages"`, ``] : []),
        `export const langs = [${langs.map((lang) => JSON.stringify(lang)).join(", ")}] as const`,
        ``,
        `export type Lang = typeof langs[number]`,
        ``,
        `export type MessageContext = { lang: Lang }`,
        ``,
        `export const m = ${object(tree, "")}`,
        ``,
    ]

    const implementations = [
        ...header,
        `import type { MessageContext } from "./index"`,
        ``,
        ...declarations,
        ...compiled.map((code) => `${code}\n`),
    ]

    return {
        "_messages.ts": `${implementations.join("\n").trimEnd()}\n`,
        "index.ts": index.join("\n"),
    }
}

/** `_authSignIn` for `auth.signIn`, the `_` keeps reserved words such as `from` apart. */
function nameOf(key: string): string {
    const segments = key.split(".").map((segment, i) => i ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment)
    return `_${segments.join("")}`
}

function isIdentifier(name: string): boolean {
    return /^[a-z_$][\w$]*$/i.test(name)
}

// Quoted when it has to be: `en`, `"pt-BR"`.
function objectKey(name: string): string {
    return isIdentifier(name) ? name : JSON.stringify(name)
}

function escapeTemplate(value: string): string {
    return value.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${")
}

/**
 * A function that returns the message in `ctx.lang`, one `if` per language. The first language of
 * the message comes last, which a language that has not been translated yet falls through to.
 */
function compileMessage(name: string, message: Message, langs: string[], include: (helper: Helper) => Helper): string {
    const props = new Map<string, PropType>()

    // A prop that is used as a number or date somewhere has to be one everywhere.
    function prop(name: string, type: PropType): string {
        const previous = props.get(name)
        if (!previous || ranks[type] > ranks[previous]) props.set(name, type)
        return isIdentifier(name) ? `props.${name}` : `props[${JSON.stringify(name)}]`
    }

    // `"Sign in"`, `` `Hi ${props.name}` ``, or the ternary of a message that is a single plural.
    function expression(parts: Part[], lang: string, pound?: string): string {
        const [only] = parts
        if (parts.length === 1 && (only!.type === "plural" || only!.type === "select")) return choice(only!, lang, pound)
        if (parts.every((part) => part.type === "text")) return JSON.stringify(parts.map((part) => part.value).join(""))
        return `\`${parts.map((part) => segment(part, lang, pound)).join("")}\``
    }

    // A part of a template literal.
    function segment(part: Part, lang: string, pound?: string): string {
        switch (part.type) {
            case "text":
                return escapeTemplate(part.value)
            case "argument":
                return `\${${prop(part.name, "text")}}`
            case "pound":
                return `\${${include("numberFormat")}(${JSON.stringify(lang)}).format(${pound})}`
            case "number":
                return `\${${include("numberFormat")}(${JSON.stringify(lang)}).format(${prop(part.name, "number")})}`
            case "date":
            case "time": {
                const helper = include(part.type === "date" ? "dateFormat" : "timeFormat")
                const style = JSON.stringify(part.style ?? "medium")
                return `\${${helper}(${JSON.stringify(lang)}, ${style}).format(${prop(part.name, "date")})}`
            }
            case "plural":
            case "select":
                return `\${${choice(part, lang, pound)}}`
        }
    }

    // `a ? … : b ? … : other`
    function choice(part: Extract<Part, { type: "plural" | "select" }>, lang: string, pound?: string): string {
        if (part.type === "select") {
            const value = prop(part.name, "string")
            return branches(part.options, lang, (key) => `${value} === ${JSON.stringify(key)}`, pound)
        }
        const value = prop(part.name, "number")
        const type = part.ordinal ? `, "ordinal"` : ""
        const rules = `${include("pluralRules")}(${JSON.stringify(lang)}${type})`
        // An exact match such as `=1` wins over its category, so those are tested first.
        const exact = ({ key }: Option): number => key.startsWith("=") ? 0 : 1
        const options = part.options.toSorted((a, b) => exact(a) - exact(b))
        const test = (key: string): string => key.startsWith("=")
            ? `${value} === ${Number(key.slice(1))}`
            : `${rules}.select(${value}) === ${JSON.stringify(key)}`
        return branches(options, lang, test, value)
    }

    // The parser makes sure there is an `other`.
    function branches(options: Option[], lang: string, test: (key: string) => string, pound?: string): string {
        const other = options.find((option) => option.key === "other")!
        const cases = options
            .filter((option) => option !== other)
            .map((option) => `${test(option.key)} ? ${expression(option.parts, lang, pound)} : `)
        return `${cases.join("")}${expression(other.parts, lang, pound)}`
    }

    const [fallback] = message.langs.keys()
    const translated = langs.filter((lang) => lang !== fallback && message.langs.has(lang))
    const body = [
        ...translated.map((lang) => `    if (ctx.lang === ${JSON.stringify(lang)}) return ${expression(message.langs.get(lang)!, lang)}`),
        `    return ${expression(message.langs.get(fallback!)!, fallback!)}`,
    ]

    const fields = [...props]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, type]) => `${objectKey(name)}: ${types[type]}`)
    const params = [
        translated.length ? "ctx: MessageContext" : "_ctx: MessageContext",
        ...(fields.length ? [`props: { ${fields.join(", ")} }`] : []),
    ]

    return [
        `export function ${name}(${params.join(", ")}): string {`,
        ...body,
        `}`,
    ].join("\n")
}
