// Builds src/Syntax/languages.ts, src/grammars and the grammar entries of LICENSE from Linguist's languages and
// starry-night's grammars, with the decisions in languages.config.ts on top. Usage: bun scripts/languages.ts
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { plain } from "../src/Syntax/internals/plain"
import { owners, popular, titles } from "./languages.config"

const linguistVersion = "v9.7.0"
const starryNightVersion = "3.11.0"

const root = join(import.meta.dir, "..")

type Linguist = Record<string, { aliases?: string[], extensions?: string[], tm_scope?: string }>
type Grammar = { dependencies?: string[], extensions?: string[], extensionsWithDot?: string[], names?: string[], scopeName: string }
type Entry = { extensions: string[], linguist: string, names: string[], popular: boolean, scope: string, title: string }

// --- Sources ---

async function download(url: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${response.status} ${url}`)
    return response
}

const linguist = Bun.YAML.parse(await (await download(`https://raw.githubusercontent.com/github-linguist/linguist/${linguistVersion}/lib/linguist/languages.yml`)).text()) as Linguist

const starryDir = mkdtempSync(join(tmpdir(), "starry-night-"))
writeFileSync(join(starryDir, "package.tgz"), Buffer.from(await (await download(`https://registry.npmjs.org/@wooorm/starry-night/-/starry-night-${starryNightVersion}.tgz`)).arrayBuffer()))
execFileSync("tar", ["-xzf", "package.tgz"], { cwd: starryDir })
const starry = join(starryDir, "package")

// Grammars by scope, and the scope each file of lang/ stands for, alias files included
const grammars = new Map<string, { file: string, grammar: Grammar, source: string }>()
const scopeOfFile = new Map<string, string>()
for (const file of readdirSync(join(starry, "lang"))) {
    if (!file.endsWith(".js")) continue
    const grammar = (await import(join(starry, "lang", file))).default as Grammar
    scopeOfFile.set(file.slice(0, -3), grammar.scopeName)
    const source = readFileSync(join(starry, "lang", file), "utf8")
    if (!source.startsWith("// This is an alias")) grammars.set(grammar.scopeName, { file, grammar, source })
}

// The notice entry of every grammar file, plus the Vue grammar's, which the notice leaves out
const sections = readFileSync(join(starry, "notice"), "utf8").split(/^=+$/m).map((section) => section.trim()).filter((section) => section.startsWith("Files in"))
sections.push(`Files in \`starry-night\`: lang/source.vue.js\nFrom source: <https://github.com/vuejs/language-tools>\nSPDX: mit\n${"-".repeat(105)}\nLicense from source file: LICENSE\n\n${readFileSync(join(import.meta.dir, "vue-license.txt"), "utf8").trim()}`)
const filesOf = (section: string) => section.split("\n")[0]!.replace(/^Files in `starry-night`: /, "").split(", ")
// A grammar the notice has no entry for shares the entry of another grammar from its repository, as Linguist's grammars.yml
// groups them
const repositories = Bun.YAML.parse(await (await download(`https://raw.githubusercontent.com/github-linguist/linguist/${linguistVersion}/grammars.yml`)).text()) as Record<string, string[]>
const ownSectionOf = (file: string) => sections.find((section) => filesOf(section).includes(`lang/${file}`))
function sectionOf(file: string) {
    const own = ownSectionOf(file)
    if (own) return own
    const scope = scopeOfFile.get(file.slice(0, -3))!
    const siblings = Object.values(repositories).find((scopes) => scopes.includes(scope)) ?? []
    for (const sibling of siblings) {
        const section = grammars.has(sibling) ? ownSectionOf(grammars.get(sibling)!.file) : undefined
        if (section) return section
    }
    return undefined
}

const licensed = (scope: string) => grammars.has(scope) && !!sectionOf(grammars.get(scope)!.file)

// --- Languages ---

const lower = (words: string[]) => [...new Set(words.map((word) => word.toLowerCase()))]
const entries: Entry[] = []
// Languages whose grammar has no license we know of
const unlicensed: string[] = []
for (const [title, language] of Object.entries(linguist)) {
    const scope = scopeOfFile.get(language.tm_scope ?? "")
    if (!scope) continue
    if (!licensed(scope)) {
        unlicensed.push(title)
        continue
    }
    entries.push({
        extensions: lower((language.extensions ?? []).map((extension) => extension.slice(1))).filter((extension) => !plain.includes(extension)),
        linguist: title,
        names: lower([title.replaceAll(" ", "-"), ...language.aliases ?? []]).filter((name) => !plain.includes(name)),
        popular: popular.includes(title),
        scope,
        title: titles[title] ?? title,
    })
}

const problems: string[] = []
const known = new Set(entries.map((entry) => entry.linguist))
for (const title of [...popular, ...Object.keys(titles), ...Object.values(owners)]) {
    if (!known.has(title)) problems.push(`languages.config.ts names a language Linguist has no grammar for: ${title}`)
}

// A word that several languages claim as a name or an extension belongs to the one `owners` gives it to
const claims = new Map<string, Entry[]>()
for (const entry of entries) {
    for (const word of new Set([...entry.names, ...entry.extensions])) claims.set(word, [...claims.get(word) ?? [], entry])
}
const unowned: string[] = []
for (const [word, claimants] of claims) {
    if (claimants.length < 2) {
        if (owners[word]) problems.push(`languages.config.ts gives ${word} an owner, only ${claimants[0]!.linguist} claims it`)
        continue
    }
    const owner = owners[word]
    if (!owner) {
        unowned.push(`    ${JSON.stringify(word)}: ${JSON.stringify(propose(word, claimants))}, // ${claimants.map((entry) => entry.linguist).join(", ")}`)
        continue
    }
    if (!claimants.some((entry) => entry.linguist === owner)) problems.push(`${owner} does not claim ${word}`)
    for (const entry of claimants) {
        if (entry.linguist === owner) continue
        entry.names = entry.names.filter((name) => name !== word)
        entry.extensions = entry.extensions.filter((extension) => extension !== word)
    }
}
if (unowned.length) problems.push(`Words several languages claim, without an owner in languages.config.ts:\n${unowned.join("\n")}`)

if (problems.length) {
    console.error(problems.join("\n"))
    process.exit(1)
}

// The owner proposed for a word: the language it names, else the popular one, else the one it is the first extension of
function propose(word: string, claimants: Entry[]): string {
    const pick = (matches: Entry[]) => matches.length === 1 ? matches[0]!.linguist : undefined
    return pick(claimants.filter((entry) => entry.names.includes(word)))
        ?? pick(claimants.filter((entry) => entry.popular))
        ?? pick(claimants.filter((entry) => entry.extensions[0] === word))
        ?? "?"
}

entries.sort((a, b) => a.title.localeCompare(b.title, "en"))

// --- Grammars: every language's and everything they include ---

function includes(scope: string) {
    const found = new Set<string>()
    for (const [, include] of JSON.stringify(grammars.get(scope)!.grammar).matchAll(/"include":"([^"#$][^"#]*)/g)) {
        if (include !== scope && licensed(include!)) found.add(include!)
    }
    return [...found].sort()
}
const needed = new Set<string>()
function visit(scope: string) {
    if (needed.has(scope)) return
    needed.add(scope)
    for (const include of includes(scope)) visit(include)
}
for (const entry of entries) visit(entry.scope)

const licenseNames: Record<string, string> = { "apache-2.0": "Apache-2.0", "bsd-2-clause": "BSD-2-Clause", "bsd-3-clause": "BSD-3-Clause", "cc0-1.0": "CC0-1.0", "isc": "ISC", "mit": "MIT", "mpl-2.0": "MPL-2.0", "unlicense": "Unlicense", "wtfpl": "WTFPL", "zlib": "Zlib" }
// Each grammar file says where it is developed and under which license, the notice who holds the copyright
function provenance(file: string, source: string) {
    const section = sectionOf(file)
    // A grammar without a header of its own has the license of the notice entry it shares
    const license = source.match(/licensed `([^`]+)`/)?.[1] ?? section?.match(/^SPDX: (.+)$/m)?.[1]
    const url = source.match(/developed at\n\/\/ <([^>]+)>/)?.[1]
    const copyright = section?.match(/^.*Copyright.*$/im)?.[0].trim().replace(/^Copyright\s*/i, "")
    const name = license && license !== "permissive" ? licenseNames[license] ?? license : "a permissive license"
    return copyright ? `${name}, Copyright ${copyright}` : url ? `${name}, from ${url}` : name
}

// Regexes Ferroni reads differently from C Oniguruma
const regexKeys = new Set(["begin", "end", "match", "while"])
function fixRegexes(value: unknown, key?: string): unknown {
    // source.sy matches a soft hyphen as `\xC2\xAD|\xAD`, a lone byte Ferroni rejects
    if (typeof value === "string") return key && regexKeys.has(key) ? fixEscapes(value.replaceAll(String.raw`\xC2\xAD|\xAD`, String.raw`\x{AD}`)) : value
    if (Array.isArray(value)) return value.map((item) => fixRegexes(item))
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fixRegexes(v, k)]))
    return value
}

rmSync(join(root, "src/grammars"), { force: true, recursive: true })
mkdirSync(join(root, "src/grammars"))
for (const scope of needed) {
    const { file, grammar, source } = grammars.get(scope)!
    const { dependencies, extensions, extensionsWithDot, names, ...rest } = grammar
    const json = JSON.stringify(fixRegexes(rest)).replaceAll("\\", "\\\\").replaceAll("'", "\\'")
    writeFileSync(join(root, "src/grammars", `${scope}.ts`), `// Taken from @wooorm/starry-night@${starryNightVersion} (lang/${file}), ${provenance(file, source)}\nexport default '${json}'\n`)
}

const q = JSON.stringify
const list = (words: string[]) => `[${words.map((word) => q(word)).join(", ")}]`
writeFileSync(
    join(root, "src/grammars/index.ts"),
    [
        "// Each grammar is its own chunk, loaded the first time a language that uses it is highlighted, with the grammars it includes.",
        "// The paths end in .js since scopes like source.ts would otherwise read as TypeScript extensions.",
        "export const grammars: Record<string, { includes: string[], load: () => Promise<{ default: string }> }> = {",
        ...[...needed].sort().map((scope) => `    ${q(scope)}: { includes: ${list(includes(scope))}, load: () => import(${q(`./${scope}.js`)}) },`),
        "}\n",
    ].join("\n"),
)

// Everything before the list stays, its documentation
const languagesFile = join(root, "src/Syntax/languages.ts")
const languagesSource = readFileSync(languagesFile, "utf8")
writeFileSync(
    languagesFile,
    [
        `${languagesSource.slice(0, languagesSource.indexOf("export const languages"))}export const languages: Language[] = [`,
        ...entries.map((entry) => `    { extensions: ${list(entry.extensions)}, names: ${list(entry.names)}, popular: ${entry.popular}, scope: ${q(entry.scope)}, title: ${q(entry.title)} },`),
        "]\n",
    ].join("\n"),
)

// LICENSE: everything up to the grammar entries, then the notice entries of the grammars copied. Entries whose license reads
// the same, apart from copyright lines, titles, case, spacing and punctuation, share one copy of it: each lists its files,
// where they come from and their copyright lines, then the license follows once.
const licenseFile = join(root, "LICENSE")
const license = readFileSync(licenseFile, "utf8")
const rule = `\n\n${"-".repeat(80)}\n\n`
const copied = new Map<string, string[]>()
for (const scope of [...needed].sort()) {
    const section = sectionOf(grammars.get(scope)!.file)
    if (section) copied.set(section, [...copied.get(section) ?? [], `src/grammars/${scope}.ts`])
}
const isCopyright = (line: string) => /^\s*(?:copyright|\(c\)|©)/i.test(line)
const isTitle = (line: string) => /^\W*(?:the\s+)?(?:mit|isc)\s+license(?:\s*\(mit\))?\W*$/i.test(line)
const groups = new Map<string, { entries: string[], text: string }>()
for (const [section, files] of copied) {
    const lines = section.split("\n")
    const source = lines.find((line) => line.startsWith("From source: "))!.replace("From source: ", "From ")
    const body = lines.slice(lines.findIndex((line) => line.startsWith("-----")) + 1).filter((line) => !line.startsWith("License from source file"))
    const text = body.filter((line) => !isCopyright(line)).join("\n").trim()
    const key = body.filter((line) => !isCopyright(line) && !isTitle(line)).join("").toLowerCase().replaceAll(/[^a-z]/g, "")
    const group = groups.get(key) ?? { entries: [], text }
    group.entries.push([files.join(", "), source, ...body.filter(isCopyright).map((line) => line.trim())].join("\n"))
    groups.set(key, group)
}
const notices = [...groups.values()].map((group) => `${group.entries.join("\n\n")}\n\n${group.text}`)
writeFileSync(licenseFile, `${license.slice(0, license.indexOf(`${rule}src/grammars/`))}${rule}${notices.join(rule)}\n`)

// dprint sorts the keys and wraps the long lines
execFileSync(join(root, "../../node_modules/.bin/dprint"), ["fmt", join(root, "src/grammars/index.ts"), languagesFile], { cwd: root, stdio: "ignore" })
rmSync(starryDir, { force: true, recursive: true })
console.log(`${entries.length} languages, ${entries.filter((entry) => entry.popular).length} popular, ${needed.size} grammars`)
if (unlicensed.length) console.log(`Left out, their grammar has no license in starry-night's notice: ${unlicensed.join(", ")}`)

// A byte escape such as \xA0 is a code point to C Oniguruma but an invalid byte to Ferroni: it becomes \x{A0}.
// Escapes in a row that form a UTF-8 sequence, such as \xEF\xBB\xBF, stay as they are.
function fixEscapes(source: string): string {
    let out = ""
    let i = 0
    while (i < source.length) {
        if (source[i] !== "\\") {
            out += source[i++]
            continue
        }
        if (!/^x[0-9A-Fa-f]{2}/.test(source.slice(i + 1, i + 4))) {
            out += source.slice(i, i + 2)
            i += 2
            continue
        }
        const bytes: number[] = []
        while (/^\\x[0-9A-Fa-f]{2}/.test(source.slice(i, i + 4))) {
            bytes.push(Number.parseInt(source.slice(i + 2, i + 4), 16))
            i += 4
        }
        const hex = (byte: number) => byte.toString(16).toUpperCase().padStart(2, "0")
        for (let k = 0; k < bytes.length;) {
            const byte = bytes[k]!
            const size = byte >= 0xC2 && byte <= 0xDF ? 2 : byte >= 0xE0 && byte <= 0xEF ? 3 : byte >= 0xF0 && byte <= 0xF4 ? 4 : 1
            const sequence = bytes.slice(k, k + size)
            if (size > 1 && sequence.length === size && sequence.slice(1).every((next) => next >= 0x80 && next <= 0xBF)) {
                out += sequence.map((next) => `\\x${hex(next)}`).join("")
                k += size
            }
            else {
                out += byte < 0x80 ? `\\x${hex(byte)}` : `\\x{${hex(byte)}}`
                k++
            }
        }
    }
    return out
}
